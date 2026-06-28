import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ApolloLead, ApolloSearchResult } from '../lib/apollo'
import type { CampaignPayload } from '../App'
import {
  Zap, LogOut, ArrowLeft, Download, ExternalLink,
  Mail, Building2, Users, Loader2, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Search, History
} from 'lucide-react'

interface Props {
  user: User
  payload: CampaignPayload
  result: ApolloSearchResult
  isLoading: boolean
  onLoadPage: (page: number) => void
  onNewCampaign: () => void
  onHistory: () => void
  onLogout: () => void
  onSwipe: () => void
}

function exportCSV(leads: ApolloLead[], campaignName: string) {
  const headers = ['Nombre', 'Apellido', 'Cargo', 'Email', 'Empresa', 'Empleados', 'País', 'LinkedIn']
  const rows = leads.map(l => [
    l.first_name,
    l.last_name || l.last_name_obfuscated || '',
    l.title,
    l.email ?? '',
    l.organization?.name ?? '',
    l.organization?.estimated_num_employees ?? '',
    l.country ?? '',
    l.linkedin_url ?? '',
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

const AVATAR_COLORS = [
  'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-violet-500/20 text-violet-300 border-violet-500/30',
  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'bg-rose-500/20 text-rose-300 border-rose-500/30',
]

function getAvatarColor(name: string) {
  const code = name.charCodeAt(0) || 0
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

function getInitials(firstName: string, lastName?: string | null) {
  const first = firstName?.[0]?.toUpperCase() ?? ''
  const last = lastName?.[0]?.toUpperCase() ?? ''
  return first + last || '?'
}

type Filter = 'all' | 'account' | 'new' | 'hubspot'

export default function Results({ user, payload, result, isLoading, onLoadPage, onNewCampaign, onHistory, onLogout, onSwipe }: Props) {
  const [currentPage, setCurrentPage] = useState(result.page)
  const [filter, setFilter] = useState<Filter>('all')
  const totalPages = Math.ceil(result.total / result.per_page)
  const { icp } = payload

  const goToPage = (page: number) => {
    setCurrentPage(page)
    onLoadPage(page)
  }

  const emailCount = result.leads.filter(l => l.email).length
  const hubspotCount = result.leads.filter(l => (l as any).inHubSpot).length
  const emailPct = result.leads.length > 0 ? Math.round((emailCount / result.leads.length) * 100) : 0
  const savedCount = result.leads.filter(l => l.isFromAccount).length
  // Verdaderamente nuevo = no está en Apollo NI en HubSpot
  const trueNewCount = result.leads.filter(l => !l.isFromAccount && !(l as any).inHubSpot).length

  const filteredLeads = result.leads.filter(l => {
    if (filter === 'account') return l.isFromAccount
    if (filter === 'new') return !l.isFromAccount && !(l as any).inHubSpot
    if (filter === 'hubspot') return (l as any).inHubSpot
    return true
  })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-700/30 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap size={15} className="text-slate-900" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">LeadFlow</span>
            <span className="text-slate-700">/</span>
            <span className="text-sm text-slate-400 truncate max-w-48">{payload.campaign_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 rounded-lg hover:bg-slate-800/60 hover:text-slate-200 transition-all"
            >
              <History size={13} />
              <span className="hidden sm:inline">Historial</span>
            </button>
            <button
              onClick={() => exportCSV(result.leads, payload.campaign_name)}
              disabled={result.leads.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg hover:bg-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={13} /> Exportar CSV
            </button>
            <button
              onClick={onSwipe}
              disabled={result.leads.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-medium rounded-lg hover:bg-violet-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ✦ Match:
            </button>
            <div className="w-px h-4 bg-slate-700/60 mx-0.5" />
            <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
            <button onClick={onLogout} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-slate-800/50">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Back + title */}
        <div className="flex items-center gap-3 animate-fade-up">
          <button
            onClick={onNewCampaign}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" /> Nueva campaña
          </button>
          <span className="text-slate-700">/</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white font-semibold">{result.total.toLocaleString()} leads encontrados</span>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-up stagger-1">
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center">
                <Users size={13} className="text-slate-400" />
              </div>
              <span className="text-xs text-slate-500 font-medium">Total leads</span>
            </div>
            <p className="text-2xl font-bold text-white">{result.leads.length}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {icp.payload.countries.slice(0, 1).map(c => (
                <span key={c} className="text-[10px] bg-slate-700/60 border border-slate-600/40 text-slate-400 rounded px-1.5 py-0.5">{c}</span>
              ))}
            </div>
          </div>

          {/* Guardados en tu cuenta */}
          <div className="bg-cyan-500/8 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center">
                <Zap size={13} className="text-cyan-400" />
              </div>
              <span className="text-xs text-slate-500 font-medium">Tu cuenta Apollo</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">{savedCount}</p>
            <p className="text-[10px] text-slate-600 mt-2">Sin costo de créditos</p>
          </div>

          {/* Nuevos */}
          <div className="bg-violet-500/8 border border-violet-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                <Search size={13} className="text-violet-400" />
              </div>
              <span className="text-xs text-slate-500 font-medium">Nuevos contactos</span>
            </div>
            <p className="text-2xl font-bold text-violet-400">{trueNewCount}</p>
            <p className="text-[10px] text-slate-600 mt-2">No están en Apollo ni HubSpot</p>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Mail size={13} className="text-emerald-400" />
              </div>
              <span className="text-xs text-slate-500 font-medium">Con email</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">{emailCount}</p>
            <div className="mt-2">
              <div className="h-1 bg-slate-700/50 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full" style={{ width: `${emailPct}%` }} />
              </div>
              <span className="text-[10px] text-slate-600">{emailPct}% del total</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="animate-fade-up stagger-2 bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
          {/* Filter tabs */}
          {!isLoading && result.leads.length > 0 && (
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-slate-700/40 bg-slate-900/40">
              {([
                { key: 'all', label: `Todos (${result.leads.length})` },
                { key: 'account', label: `Tu cuenta (${savedCount})`, color: 'cyan' },
                { key: 'new', label: `Nuevos (${trueNewCount})`, color: 'violet' },
                { key: 'hubspot', label: `HubSpot (${hubspotCount})`, color: 'orange' },
              ] as { key: Filter, label: string, color?: string }[]).map(f => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f.key
                      ? f.color === 'cyan' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : f.color === 'violet' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                        : f.color === 'orange' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                        : 'bg-slate-700/60 text-white border border-slate-600/50'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-emerald-400" />
            </div>
          ) : result.leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Search size={32} className="text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm">No se encontraron leads con estos filtros</p>
              <p className="text-slate-600 text-xs mt-1">Probá ampliando los criterios de búsqueda</p>
            </div>
          ) : (
            <div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50 bg-slate-900/60">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs w-[30%]">Contacto</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs w-[26%]">Empresa</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium text-xs w-[30%]">Email</th>
                    <th className="text-center px-3 py-3 text-slate-400 font-medium text-xs w-[14%]">LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, i) => {
                    const displayName = lead.name || `${lead.first_name} ${lead.last_name || lead.last_name_obfuscated || ''}`.trim()
                    const avatarColor = getAvatarColor(lead.first_name || displayName)
                    const initials = getInitials(lead.first_name, lead.last_name || lead.last_name_obfuscated)
                    return (
                      <tr
                        key={lead.id ?? i}
                        className="border-b border-slate-700/20 hover:bg-slate-700/15 transition-colors"
                      >
                        {/* Contacto: avatar + nombre + cargo */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${avatarColor}`}>
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-white font-medium text-xs truncate">{displayName}</span>
                                {lead.isFromAccount && (
                                  <span className="flex-shrink-0 text-[9px] font-semibold bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 rounded px-1.5 py-0.5">Tu cuenta</span>
                                )}
                                {(lead as any).inHubSpot && (
                                  <span className="flex-shrink-0 text-[9px] font-semibold bg-orange-500/15 border border-orange-500/25 text-orange-400 rounded px-1.5 py-0.5">CRM</span>
                                )}
                              </div>
                              <span className="text-slate-500 text-[11px] truncate block">{lead.title ?? '—'}</span>
                            </div>
                          </div>
                        </td>
                        {/* Empresa: nombre + empleados */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Building2 size={11} className="flex-shrink-0 text-slate-600" />
                            <span className="truncate text-slate-300 text-xs">{lead.organization?.name ?? '—'}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 ml-4">
                            <Users size={10} className="text-slate-600 flex-shrink-0" />
                            <span className="text-[11px] text-slate-500">
                              {lead.organization?.estimated_num_employees
                                ? lead.organization.estimated_num_employees.toLocaleString()
                                : '—'}
                              {lead.country ? ` · ${lead.country}` : ''}
                            </span>
                          </div>
                        </td>
                        {/* Email */}
                        <td className="px-4 py-3">
                          {lead.email ? (
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                              <a href={`mailto:${lead.email}`} className="text-emerald-400 hover:underline truncate text-xs">{lead.email}</a>
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-600 text-xs">
                              <XCircle size={11} /> No disponible
                            </span>
                          )}
                        </td>
                        {/* LinkedIn */}
                        <td className="px-3 py-3 text-center">
                          {lead.linkedin_url ? (
                            <a href={lead.linkedin_url} target="_blank" rel="noreferrer"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-all">
                              <ExternalLink size={11} />
                            </a>
                          ) : (
                            <span className="text-slate-700 text-xs">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between animate-fade-up stagger-3">
            <span className="text-xs text-slate-500">
              Página {currentPage} de {totalPages} · {result.total.toLocaleString()} resultados
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || isLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i
                return (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    disabled={isLoading}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                      page === currentPage
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                  >
                    {page}
                  </button>
                )
              })}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || isLoading}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
