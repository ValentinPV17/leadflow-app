import type { CampaignPayload } from '../App'
import { useState } from 'react'
import { CheckCircle2, FileSpreadsheet, Sparkles, LogOut } from 'lucide-react'

interface Props {
  payload: CampaignPayload
  onNewCampaign: () => void
  onLogout: () => void
}

export default function Success({ payload, onNewCampaign, onLogout }: Props) {
  const [showPayload, setShowPayload] = useState(false)

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        {/* Check icon */}
        <div className="animate-scale-in mb-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 size={40} className="text-emerald-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 animate-fade-up stagger-1">
          ¡Campaña enviada!
        </h1>
        <p className="text-slate-400 mb-6 animate-fade-up stagger-1">
          Tu búsqueda de leads está siendo procesada. Recibirás el{' '}
          <strong className="text-emerald-300">Excel con los resultados</strong> en tu email.
        </p>

        <div className="animate-fade-up stagger-2 space-y-3">
          {/* Campaign summary */}
          <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl p-4 text-left">
            <div className="flex items-center gap-2 mb-3">
              <FileSpreadsheet size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-white">Resumen de la campaña</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-slate-500">Nombre</div>
              <div className="text-slate-300">{payload.campaign_name}</div>
              <div className="text-slate-500">Industrias</div>
              <div className="text-slate-300">{payload.icp.payload.industries.join(', ')}</div>
              <div className="text-slate-500">Títulos</div>
              <div className="text-slate-300">{payload.icp.payload.titles.join(', ')}</div>
              <div className="text-slate-500">Países</div>
              <div className="text-slate-300">{payload.icp.payload.countries.join(', ')}</div>
              <div className="text-slate-500">Min. empleados</div>
              <div className="text-slate-300">{payload.icp.payload.employees_min}</div>
              <div className="text-slate-500">Email destino</div>
              <div className="text-emerald-300">{payload.user.email}</div>
            </div>
          </div>

          {/* Debug payload */}
          <button
            onClick={() => setShowPayload(!showPayload)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
          >
            {showPayload ? 'Ocultar' : 'Ver'} payload técnico (debug)
          </button>
          {showPayload && (
            <pre className="bg-slate-900/80 border border-slate-700/30 rounded-lg p-3 text-[11px] text-emerald-300/80 text-left overflow-x-auto max-h-48 overflow-y-auto font-mono">
              {JSON.stringify(payload, null, 2)}
            </pre>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onNewCampaign}
              className="flex-1 py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium rounded-lg hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles size={14} /> Nueva campaña
            </button>
            <button
              onClick={onLogout}
              className="py-2.5 px-4 bg-slate-800/50 border border-slate-700/40 text-slate-400 text-sm rounded-lg hover:text-white transition-all"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
