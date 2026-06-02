import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import type { User } from '@supabase/supabase-js'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Success from './pages/Success'

export type AppScreen = 'login' | 'dashboard' | 'success'

export interface CampaignPayload {
  tenant_id: string
  icp_run_id: string
  campaign_name: string
  icp: {
    payload: {
      industries: string[]
      titles: string[]
      country: string
      employees_min: number
      seniorities: string[]
    }
  }
  user: { id: string; email: string }
}

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [lastPayload, setLastPayload] = useState<CampaignPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) setScreen('dashboard')
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        setScreen('dashboard')
      } else {
        setScreen('login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setScreen('login')
  }

  const handleCampaignSent = (payload: CampaignPayload) => {
    setLastPayload(payload)
    setScreen('success')
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
        />
      )
    case 'success':
      return (
        <Success
          payload={lastPayload!}
          onNewCampaign={() => setScreen('dashboard')}
          onLogout={handleLogout}
        />
      )
  }
}
