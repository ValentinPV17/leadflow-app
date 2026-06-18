import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import {
  Zap, LogOut, ArrowLeft, Calendar, Globe, Building2,
  ChevronRight, Loader2, RotateCcw, Download, Inbox
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  industries: string[]
  titles: string[]
  countries: string[]
  employees_min: number
  seniorities: string[]
  status: string
  created_at: string
  lead_count?: number
}

interface Lead {
  id: string
  first_name: string
  last_name: string
  full_name: string | null
  title: string
  email: string | null
  person_linkedin: string | null
  company_name: string | null
  company_domain: string | null
  country: string | null
}

interface Props {
  user: User
  onLogout: () => void
  onNewCampaign: () => void
  onRerunCampaign: (campaign: Campaign) => void
}

function exportLeadsCSV(leads: Lead[], campaignName: string) {
  const headers = ['Nombre', 'Apellido', 'Cargo', 'Email', 'Empresa', 'Dominio', 'País', 'LinkedIn']
  const rows = leads.map(l => [
    l.first_name, l.last_name, l.title, l.email ?? '',
    l.company_name ?? '', l.company_domain ?? '',
    l.country ?? '', l.person_linkedin ?? '',
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${campaignName.replace(/\s+/g, '_')}_leads.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function History({ user, onLogout, onNewCampaign, onRerunCampaign }: Props) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      // Get lead counts for each campaign
      const withCounts = await Promise.all(
        data.map(async (c) => {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', c.id)
          return { ...c, lead_count: count ?? 0 }
        })
      )
      setCampaigns(withCounts)
    }
    setLoading(false)
  }

  const loadLeads = async (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setLoadingLeads(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('campaign_id', campaign.id)
      .order('created_at', { ascending: true })

    setLeads(data ?? [])
    setLoadingLeads(false)
  }

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-700/30 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <Zap size={14} className="text-slate-900" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">LeadFlow</span>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-slate-400">Historial</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNewCampaign}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg hover:bg-emerald-500/25 transition-all"
            >
              + Nueva campaña
            </button>
            <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
            <button onClick={onLogout} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-slate-800/50">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* Campaign detail view */}
        {selectedCampaign ? (
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setSelectedCampaign(null); setLeads([]) }}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={13} /> Volver
                </button>
                <h2 className="text-white font-semibold">{selectedCampaign.name}</h2>
                <span className="text-xs text-slate-500">{formatDate(selectedCampaign.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRerunCampaign(selectedCampaign)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-600/50 text-slate-300 text-xs font-medium rounded-lg hover:border-slate-400 transition-all"
                >
                  <RotateCcw size={12} /> Re-lanzar
                </button>
                <button
                  onClick={() => exportLeadsCSV(leads, selectedCampaign.name)}
                  disabled={leads.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg hover:bg-emerald-500/25 transition-all disabled:opacity-40"
                >
                  <Download size={12} /> Exportar CSV
                </button>
              </div>
            </div>

            {/* ICP summary */}
            <div className="flex flex-wrap gap-1.5">
              {selectedCampaign.countries.map(c => (
                <span key={c} className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded px-2 py-0.5">{c}</span>
              ))}
              {selectedCampaign.industries.map(i => (
                <span key={i} className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded px-2 py-0.5">{i}</span>
              ))}
              <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded px-2 py-0.5">{leads.length} leads</span>
              <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded px-2 py-0.5">
                {leads.filter(l => l.email).length} con email
              </span>
            </div>

            {/* Leads table */}
            <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
              {loadingLeads ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={22} className="animate-spin text-emerald-400" />
                </div>
              ) : leads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <Inbox size={28} className="mb-2" />
                  <p className="text-sm">Sin leads guardados para esta campaña</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Nombre</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Cargo</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Empresa</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">Email</th>
                        <th className="text-left px-4 py-3 text-slate-500 font-medium">País</th>
                        <th className="text-center px-4 py-3 text-slate-500 font-medium">LinkedIn</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.id} className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-white font-medium">
                            {lead.full_name || `${lead.first_name} ${lead.last_name}`.trim()}
                          </td>
                          <td className="px-4 py-3 text-slate-300 max-w-44">
                            <span className="truncate block">{lead.title ?? '—'}</span>
                          </td>
                          <td className="px-4 py-3 max-w-40">
                            <div className="flex items-center gap-1.5">
                              <Building2 size={11} className="flex-shrink-0 text-slate-600" />
                              <span className="truncate text-slate-300">{lead.company_name ?? '—'}</span>
                            </div>
                            {lead.company_domain && (
                              <span className="text-[10px] text-slate-600 ml-4">{lead.company_domain}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-48">
                            {lead.email ? (
                              <a href={`mailto:${lead.email}`} className="text-emerald-400 hover:underline truncate block">
                                {lead.email}
                              </a>
                            ) : (
                              <span className="text-slate-600">No disponible</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{lead.country ?? '—'}</td>
                          <td className="px-4 py-3 text-center">
                            {lead.person_linkedin ? (
                              <a href={lead.person_linkedin} target="_blank" rel="noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-xs transition-colors">
                                Ver
                              </a>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

        ) : (
          /* Campaign list */
          <div className="space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-white">Historial de campañas</h1>
              <span className="text-xs text-slate-500">{campaigns.length} campañas</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-emerald-400" />
              </div>
            ) : campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-800/20 border border-slate-700/30 rounded-xl">
                <Inbox size={36} className="text-slate-600 mb-3" />
                <p className="text-slate-400 text-sm">Aún no tenés campañas guardadas</p>
                <button onClick={onNewCampaign} className="mt-4 px-4 py-2 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg hover:bg-emerald-500/25 transition-all">
                  Crear primera campaña
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => loadLeads(c)}
                    className="w-full text-left bg-slate-800/30 border border-slate-700/40 rounded-xl p-4 hover:border-slate-600/60 hover:bg-slate-800/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-semibold text-white truncate">{c.name}</span>
                          <span className="flex-shrink-0 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded px-2 py-0.5">
                            {c.lead_count} leads
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar size={11} /> {formatDate(c.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Globe size={11} /> {c.countries.join(', ')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Building2 size={11} /> {c.industries.slice(0, 2).join(', ')}{c.industries.length > 2 ? ` +${c.industries.length - 2}` : ''}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
