import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { searchApolloLeads } from './lib/apollo'
import { getHubSpotExistingEmails } from './lib/hubspot'
import type { ApolloSearchResult } from './lib/apollo'
import type { User } from '@supabase/supabase-js'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Results from './pages/Results'
import History from './pages/History'
import Integrations from './pages/Integrations'
import SwipeLeads from './pages/SwipeLeads'

export type AppScreen = 'login' | 'dashboard' | 'results' | 'history' | 'integrations' | 'swipe'

export interface CampaignPayload {
  tenant_id: string
  icp_run_id: string
  campaign_name: string
  icp: {
    payload: {
      industries: string[]
      titles: string[]
      countries: string[]
      employee_ranges: string[]
      seniorities: string[]
    }
  }
  user: { id: string; email: string }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastPayload, setLastPayload] = useState<CampaignPayload | null>(null)
  const [apolloResult, setApolloResult] = useState<ApolloSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) setScreen('dashboard')
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      // Only change screen on actual sign-in/sign-out, not token refreshes
      if (event === 'SIGNED_OUT') setScreen('login')
      if (event === 'SIGNED_IN') setScreen(prev => prev === 'login' ? 'dashboard' : prev)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setScreen('login')
  }

  const getHubSpotKey = async (): Promise<string | null> => {
    const { data } = await supabase
      .from('integrations')
      .select('credentials_encrypted')
      .eq('created_by', user!.id)
      .eq('provider', 'hubspot')
      .maybeSingle()
    if (!data?.credentials_encrypted) return null
    try {
      const parsed = JSON.parse(data.credentials_encrypted)
      return parsed.api_key ?? null
    } catch {
      return data.credentials_encrypted
    }
  }

  const handleCampaignSent = async (payload: CampaignPayload) => {
    setLastPayload(payload)
    setIsSearching(true)
    setScreen('results')

    try {
      const result = await searchApolloLeads({
        industries: payload.icp.payload.industries,
        titles: payload.icp.payload.titles,
        countries: payload.icp.payload.countries,
        employee_ranges: payload.icp.payload.employee_ranges,
        seniorities: payload.icp.payload.seniorities,
        page: 1,
        per_page: 100,
      })

      // HubSpot deduplication
      const hubspotKey = await getHubSpotKey()
      if (hubspotKey) {
        const emails = result.leads.map(l => l.email).filter(Boolean) as string[]
        const existingEmails = await getHubSpotExistingEmails(hubspotKey, emails)
        result.leads = result.leads.map(l => ({
          ...l,
          inHubSpot: !!(l.email && existingEmails.has(l.email.toLowerCase())),
        }))
      }

      setApolloResult(result)

      // Persist campaign to Supabase
      const icpSummary = [
        ...payload.icp.payload.titles.slice(0, 3),
        'en', ...payload.icp.payload.industries.slice(0, 2),
        'de', ...payload.icp.payload.countries,
      ].join(' ')

      // Get or create tenant for this user
      let tenantId: string | null = null
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('created_by', user!.id)
        .maybeSingle()

      if (existingTenant) {
        tenantId = existingTenant.id
      } else {
        const emailSlug = user!.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9]/g, '-') ?? 'user'
        const { data: newTenant } = await supabase
          .from('tenants')
          .insert({ name: user!.email ?? 'User', slug: `${emailSlug}-${Date.now()}`, created_by: user!.id })
          .select('id')
          .single()
        tenantId = newTenant?.id ?? null
      }

      if (!tenantId) {
        console.error('[Supabase] Could not resolve tenant_id')
      } else {
        const { data: campaign, error: campaignError } = await supabase
          .from('campaigns')
          .insert({
            created_by: user!.id,
            tenant_id: tenantId,
            name: payload.campaign_name,
            user_prompt: icpSummary,
            icp_run_id: payload.icp_run_id,
            industries: payload.icp.payload.industries,
            titles: payload.icp.payload.titles,
            countries: payload.icp.payload.countries,
            seniorities: payload.icp.payload.seniorities,
            status: 'draft',
          })
          .select()
          .single()

        if (campaignError) {
          console.error('[Supabase] Campaign insert error:', JSON.stringify(campaignError, null, 2))
        } else {
          console.log('[Supabase] Campaign saved OK, id:', campaign?.id)
          if (result.leads.length > 0) {
            const leadsToInsert = result.leads
              .filter(l => !(l as any).inHubSpot)
              .map(l => ({
                campaign_id: campaign.id,
                job_id: campaign.id,
                tenant_id: tenantId,
                apollo_person_id: l.id,
                first_name: l.first_name,
                last_name: l.last_name || l.last_name_obfuscated || '',
                full_name: l.name || `${l.first_name} ${l.last_name || l.last_name_obfuscated || ''}`.trim(),
                title: l.title,
                company_name: l.organization?.name || null,
                company_domain: l.organization?.primary_domain || null,
                person_linkedin: l.linkedin_url,
                email: l.email,
                city: l.city,
                country: l.country,
                raw: l,
              }))
            const { error: leadsError } = await supabase.from('leads').insert(leadsToInsert)
            if (leadsError) console.error('[Supabase] Leads insert error:', JSON.stringify(leadsError, null, 2))
            else console.log('[Supabase] Leads saved:', leadsToInsert.length)
          }
        }
      }

    } catch (e) {
      console.error('Apollo search failed:', e)
      setApolloResult({ leads: [], total: 0, page: 1, per_page: 25 })
    } finally {
      setIsSearching(false)
    }
  }

  const handleLoadPage = async (page: number) => {
    if (!lastPayload) return
    setIsSearching(true)
    try {
      const result = await searchApolloLeads({
        industries: lastPayload.icp.payload.industries,
        titles: lastPayload.icp.payload.titles,
        countries: lastPayload.icp.payload.countries,
        employee_ranges: lastPayload.icp.payload.employee_ranges,
        seniorities: lastPayload.icp.payload.seniorities,
        page,
        per_page: 100,
      })
      setApolloResult(result)
    } catch (e) {
      console.error('Apollo page load failed:', e)
    } finally {
      setIsSearching(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  switch (screen) {
    case 'login':
      return <Login />
    case 'dashboard':
      return (
        <Dashboard
          user={user!}
          onLogout={handleLogout}
          onCampaignSent={handleCampaignSent}
          onHistory={() => setScreen('history')}
          onIntegrations={() => setScreen('integrations')}
          onSwipe={() => setScreen('swipe')}
          hasResults={!!apolloResult}
          onResumeResults={() => setScreen('results')}
        />
      )
    case 'results':
      return (
        <Results
          user={user!}
          payload={lastPayload!}
          result={apolloResult ?? { leads: [], total: 0, page: 1, per_page: 25, savedCount: 0, newCount: 0 }}
          isLoading={isSearching}
          onLoadPage={handleLoadPage}
          onNewCampaign={() => setScreen('dashboard')}
          onHistory={() => setScreen('history')}
          onLogout={handleLogout}
          onSwipe={() => setScreen('swipe')}
        />
      )
    case 'history':
      return (
        <History
          user={user!}
          onLogout={handleLogout}
          onNewCampaign={() => setScreen('dashboard')}
          onRerunCampaign={() => setScreen('dashboard')}
        />
      )
    case 'integrations':
      return (
        <Integrations
          user={user!}
          onLogout={handleLogout}
          onBack={() => setScreen('dashboard')}
        />
      )
    case 'swipe':
      return (
        <SwipeLeads
          user={user!}
          onLogout={handleLogout}
          onBack={() => setScreen(apolloResult ? 'results' : 'dashboard')}
          apolloLeads={apolloResult?.leads}
          payload={lastPayload ?? undefined}
        />
      )
  }
}
