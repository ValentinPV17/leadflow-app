import type { User } from '@supabase/supabase-js'
import { Zap, LogOut, ArrowLeft, TrendingUp, Users, UserCheck, Sparkles } from 'lucide-react'

interface CreditEntry {
  date: string
  campaignName: string
  savedCount: number
  newCount: number
  total: number
}

interface Props {
  user: User
  onLogout: () => void
  onBack: () => void
}

function loadHistory(): CreditEntry[] {
  try { return JSON.parse(localStorage.getItem('lf_credit_history') ?? '[]') } catch { return [] }
}

export function recordCreditUsage(entry: CreditEntry) {
  const history = loadHistory()
  history.unshift(entry)
  try { localStorage.setItem('lf_credit_history', JSON.stringify(history.slice(0, 50))) } catch {}
}

export default function Credits({ user, onLogout, onBack }: Props) {
  const history = loadHistory()
  const totalCredits = history.reduce((acc, e) => acc + e.newCount, 0)
  const totalLeads = history.reduce((acc, e) => acc + e.total, 0)
  const totalSaved = history.reduce((acc, e) => acc + e.savedCount, 0)

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/80 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
                <Zap size={12} className="text-slate-900" />
              </div>
              <span className="text-sm font-bold text-white">Tracker de créditos</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30 hidden sm:block">{user.email}</span>
            <button
              onClick={onLogout}
              className="p-1.5 text-white/20 hover:text-white/50 transition-colors rounded-lg hover:bg-white/5"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-violet-400" />
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Créditos usados</span>
            </div>
            <p className="text-2xl font-black text-white">{totalCredits}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">contactos nuevos revelados</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck size={14} className="text-cyan-400" />
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">De tu cuenta</span>
            </div>
            <p className="text-2xl font-black text-white">{totalSaved}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">gratis (ya guardados)</p>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-emerald-400" />
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Total leads</span>
            </div>
            <p className="text-2xl font-black text-white">{totalLeads}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">en {history.length} búsqueda{history.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* History table */}
        <div className="bg-slate-800/30 border border-slate-700/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-700/30 flex items-center gap-2">
            <TrendingUp size={14} className="text-slate-400" />
            <h2 className="text-sm font-semibold text-white">Historial de búsquedas</h2>
          </div>

          {history.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-500 text-sm">Aún no hay búsquedas registradas.</p>
              <p className="text-slate-600 text-xs mt-1">Los créditos se registran automáticamente al correr una campaña.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/20">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-2.5 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                <span>Campaña</span>
                <span className="text-right">Tu cuenta</span>
                <span className="text-right text-violet-400">Créditos</span>
                <span className="text-right">Total</span>
              </div>
              {history.map((entry, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3.5 hover:bg-slate-700/20 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white truncate">{entry.campaignName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{new Date(entry.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-cyan-400">{entry.savedCount}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-violet-400">{entry.newCount}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-slate-300">{entry.total}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          1 crédito Apollo = 1 contacto nuevo revelado · Los contactos de tu cuenta son gratuitos
        </p>
      </main>
    </div>
  )
}
