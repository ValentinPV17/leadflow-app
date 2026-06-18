import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { ApolloLead, ApolloSearchResult } from '../lib/apollo'
import type { CampaignPayload } from '../App'
import {
  Zap, LogOut, ArrowLeft, Download, ExternalLink,
  Mail, Building2, Users, Loader2, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Search
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

export default function Results({ user, payload, result, isLoading, onLoadPage, onNewCampaign, onHistory, onLogout }: Props) {
  const [currentPage, setCurrentPage] = useState(result.page)
  const totalPages = Math.ceil(result.total / result.per_page)
  const { icp } = payload

  const goToPage = (page: number) => {
    setCurrentPage(page)
    onLoadPage(page)
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
            <span className="text-sm text-slate-400 truncate max-w-48">{payload.campaign_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 border border-slate-700/50 rounded-lg hover:border-slate-500 hover:text-slate-200 transition-all"
            >
              Historial
            </button>
            <button
              onClick={() => exportCSV(result.leads, payload.campaign_name)}
              disabled={result.leads.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg hover:bg-emerald-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={13} /> Exportar CSV
            </button>
            <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
            <button onClick={onLogout} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-slate-800/50">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Stats bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-white font-semibold">{result.total.toLocaleString()} leads encontrados</span>
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5">
              {result.leads.filter(l => l.email).length} con email
            </span>
            <div className="flex flex-wrap gap-1.5">
              {icp.payload.countries.map(c => (
                <span key={c} className="text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-400">{c}</span>
              ))}
              {icp.payload.industries.slice(0, 2).map(i => (
                <span key={i} className="text-[10px] bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-slate-400">{i}</span>
              ))}
            </div>
          </div>
          <button
            onClick={onNewCampaign}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={13} /> Nueva campaña
          </button>
        </div>

        {/* Table */}
        <div className="animate-fade-up stagger-1 bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Nombre</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Cargo</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Empresa</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Empleados</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">País</th>
                    <th className="text-center px-4 py-3 text-slate-500 font-medium">LinkedIn</th>
                  </tr>
                </thead>
                <tbody>
                  {result.leads.map((lead, i) => (
                    <tr
                      key={lead.id ?? i}
                      className="border-b border-slate-700/20 hover:bg-slate-700/20 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {lead.name || `${lead.first_name} ${lead.last_name || lead.last_name_obfuscated || ''}`.trim()}
                          </span>
                          {(lead as any).inHubSpot && (
                            <span className="flex-shrink-0 text-[9px] font-semibold bg-orange-500/15 border border-orange-500/25 text-orange-400 rounded px-1.5 py-0.5">
                              En HubSpot
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-300 max-w-44">
                        <span className="truncate block text-xs">{lead.title ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3 max-w-40">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={11} className="flex-shrink-0 text-slate-600" />
                          <span className="truncate text-slate-300 text-xs">
                            {lead.organization?.name ?? '—'}
                          </span>
                        </div>
                        {lead.organization?.primary_domain && (
                          <span className="text-[10px] text-slate-600 ml-4">{lead.organization.primary_domain}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Users size={11} className="text-slate-600" />
                          {lead.organization?.estimated_num_employees
                            ? lead.organization.estimated_num_employees.toLocaleString()
                            : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-48">
                        {lead.email ? (
                          <div className="flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-400 flex-shrink-0" />
                            <a href={`mailto:${lead.email}`} className="text-emerald-400 hover:underline truncate text-xs block">{lead.email}</a>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-600 text-xs">
                            <XCircle size={11} /> No disponible
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{lead.country ?? '—'}</td>
                      <td className="px-4 py-3 text-center">
                        {lead.linkedin_url ? (
                          <a
                            href={lead.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors hover:underline"
                          >
                            <ExternalLink size={11} /> Ver
                          </a>
                        ) : (
                          <span className="text-slate-600 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between animate-fade-up stagger-2">
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
