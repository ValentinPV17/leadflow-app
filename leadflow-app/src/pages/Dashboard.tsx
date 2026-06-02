import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CampaignPayload } from '../App'
import TagInput from '../components/TagInput'
import { Send, Zap, LogOut, Building2, Users, Globe, Target, ChevronDown, Loader2 } from 'lucide-react'

const COUNTRIES = ['Chile', 'Argentina', 'Colombia', 'México', 'Perú', 'Brasil', 'Estados Unidos', 'España', 'Uruguay', 'Ecuador', 'Bolivia', 'Paraguay', 'Costa Rica', 'Panamá']

const SENIORITIES = [
  { value: 'c_suite', label: 'C-Suite', desc: 'CEO, CMO, CTO...' },
  { value: 'vp', label: 'VP', desc: '' },
  { value: 'director', label: 'Director', desc: '' },
  { value: 'head', label: 'Head', desc: '' },
  { value: 'manager', label: 'Manager', desc: '' },
  { value: 'senior', label: 'Senior', desc: '' },
  { value: 'entry', label: 'Entry Level', desc: '' },
]

const INDUSTRY_SUGGESTIONS = ['SaaS', 'Marketing & Advertising', 'E-commerce', 'Fintech', 'Healthcare', 'Education', 'Real Estate', 'Logistics', 'Manufacturing', 'Retail', 'Consulting', 'Technology']
const TITLE_SUGGESTIONS = ['CEO', 'CMO', 'CTO', 'CFO', 'VP Marketing', 'Marketing Manager', 'Brand Manager', 'Growth Manager', 'Head of Marketing', 'Director of Sales', 'Business Development', 'Product Manager']

interface Props {
  user: User
  onLogout: () => void
  onCampaignSent: (payload: CampaignPayload) => void
}

export default function Dashboard({ user, onLogout, onCampaignSent }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [formData, setFormData] = useState({
    industries: [] as string[],
    titles: [] as string[],
    country: 'Chile',
    employeesMin: 50,
    seniorities: ['director', 'manager'],
  })

  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || ''
  const canSubmit = formData.titles.length > 0 && formData.industries.length > 0 && formData.country

  const toggleSeniority = (v: string) => {
    setFormData(prev => ({
      ...prev,
      seniorities: prev.seniorities.includes(v)
        ? prev.seniorities.filter(s => s !== v)
        : [...prev.seniorities, v]
    }))
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)

    const tenantId = user.email?.split('@')[1]?.split('.')[0] || 'default'

    const payload: CampaignPayload = {
      tenant_id: tenantId,
      icp_run_id: crypto.randomUUID(),
      campaign_name: campaignName || `Campaña ${new Date().toLocaleDateString('es-CL')}`,
      icp: {
        payload: {
          industries: formData.industries,
          titles: formData.titles,
          country: formData.country,
          employees_min: formData.employeesMin,
          seniorities: formData.seniorities,
        }
      },
      user: {
        id: user.id,
        email: user.email || '',
      }
    }

    // Send to n8n webhook
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (e) {
        console.warn('Webhook not reachable:', e)
      }
    }

    // Simulate processing delay for UX
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    onCampaignSent(payload)
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-700/30 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <Zap size={14} className="text-slate-900" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">LeadFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:block">{user.email}</span>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-slate-800/50"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-up">
          <h1 className="text-xl font-bold text-white mb-1">Nueva campaña de leads</h1>
          <p className="text-sm text-slate-400">Define tu ICP y enviaremos la búsqueda a Apollo automáticamente</p>
        </div>

        <div className="space-y-5">
          {/* Campaign name */}
          <div className="animate-fade-up stagger-1">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase">
              Nombre de campaña <span className="text-slate-600">(opcional)</span>
            </label>
            <input
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="Ej: Marketing Chile Q3"
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm outline-none placeholder-slate-500 focus:border-emerald-400/50 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.06)] transition-all"
            />
          </div>

          {/* Industries */}
          <div className="animate-fade-up stagger-2">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5">
              <Building2 size={12} /> Industrias <span className="text-emerald-400">*</span>
            </label>
            <TagInput
              tags={formData.industries}
              placeholder="Escribe y presiona Enter..."
              suggestions={INDUSTRY_SUGGESTIONS}
              onAdd={t => setFormData(p => ({ ...p, industries: [...p.industries, t] }))}
              onRemove={i => setFormData(p => ({ ...p, industries: p.industries.filter((_, idx) => idx !== i) }))}
            />
          </div>

          {/* Titles */}
          <div className="animate-fade-up stagger-3">
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5">
              <Users size={12} /> Cargos objetivo <span className="text-emerald-400">*</span>
            </label>
            <TagInput
              tags={formData.titles}
              placeholder="Ej: CMO, Marketing Manager..."
              suggestions={TITLE_SUGGESTIONS}
              onAdd={t => setFormData(p => ({ ...p, titles: [...p.titles, t] }))}
              onRemove={i => setFormData(p => ({ ...p, titles: p.titles.filter((_, idx) => idx !== i) }))}
            />
          </div>

          {/* Country + Employees */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up stagger-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5">
                <Globe size={12} /> País <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={formData.country}
                  onChange={e => setFormData(p => ({ ...p, country: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm outline-none appearance-none focus:border-emerald-400/50 transition-all cursor-pointer"
                >
                  {COUNTRIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5">
                <Target size={12} /> Empleados mínimos
              </label>
              <input
                type="number"
                value={formData.employeesMin}
                onChange={e => setFormData(p => ({ ...p, employeesMin: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm outline-none focus:border-emerald-400/50 transition-all font-mono"
              />
            </div>
          </div>

          {/* Seniorities */}
          <div className="animate-fade-up stagger-5">
            <label className="text-xs font-medium text-slate-400 mb-2 block tracking-wide uppercase">Nivel de seniority</label>
            <div className="flex flex-wrap gap-2">
              {SENIORITIES.map(s => (
                <button
                  key={s.value}
                  onClick={() => toggleSeniority(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    formData.seniorities.includes(s.value)
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.1)]'
                      : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-3 animate-fade-up stagger-5">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                canSubmit && !isSubmitting
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 hover:shadow-xl hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer'
                  : 'bg-slate-800/50 text-slate-600 border border-slate-700/30 cursor-not-allowed'
              }`}
            >
              {isSubmitting
                ? <><Loader2 size={16} className="animate-spin" /> Enviando a n8n...</>
                : <><Send size={15} /> Lanzar campaña</>
              }
            </button>
            {!canSubmit && !isSubmitting && (
              <p className="text-[11px] text-slate-600 mt-2 text-center">
                Agrega al menos una industria y un cargo para continuar
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
