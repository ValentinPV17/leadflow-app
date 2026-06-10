import { useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CampaignPayload } from '../App'
import TagInput from '../components/TagInput'
import { Send, Zap, LogOut, Building2, Users, Globe, Target, ChevronDown, Loader2, FileText, X, Sparkles, Ban } from 'lucide-react'

const COUNTRIES = ['Chile', 'Argentina', 'Colombia', 'Mexico', 'Peru', 'Brasil', 'Estados Unidos', 'Espana', 'Uruguay', 'Ecuador', 'Bolivia', 'Paraguay', 'Costa Rica', 'Panama']
const SENIORITIES = [{ value: 'c_suite', label: 'C-Suite' }, { value: 'vp', label: 'VP' }, { value: 'director', label: 'Director' }, { value: 'head', label: 'Head' }, { value: 'manager', label: 'Manager' }, { value: 'senior', label: 'Senior' }, { value: 'entry', label: 'Entry Level' }]
const INDUSTRY_SUGGESTIONS = ['SaaS', 'Marketing & Advertising', 'E-commerce', 'Fintech', 'Healthcare', 'Education', 'Real Estate', 'Logistics', 'Manufacturing', 'Retail', 'Consulting', 'Technology']
const TITLE_SUGGESTIONS = ['CEO', 'CMO', 'CTO', 'CFO', 'VP Marketing', 'Marketing Manager', 'Brand Manager', 'Growth Manager', 'Head of Marketing', 'Director of Sales', 'Business Development', 'Product Manager']

interface Props { user: User; onLogout: () => void; onCampaignSent: (payload: CampaignPayload) => void }

export default function Dashboard({ user, onLogout, onCampaignSent }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isParsingPDF, setIsParsingPDF] = useState(false)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfError, setPdfError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [campaignName, setCampaignName] = useState('')
  const [formData, setFormData] = useState({
    industries: [] as string[],
    excludedIndustries: [] as string[],
    titles: [] as string[],
    excludedTitles: [] as string[],
    country: 'Chile',
    employeesMin: 50,
    seniorities: ['director', 'manager']
  })

  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || ''
  const canSubmit = formData.titles.length > 0 && formData.industries.length > 0 && formData.country
  const toggleSeniority = (v: string) => setFormData(prev => ({ ...prev, seniorities: prev.seniorities.includes(v) ? prev.seniorities.filter(s => s !== v) : [...prev.seniorities, v] }))

  const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })

  const handlePDFUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') { setPdfError('Solo se aceptan archivos PDF'); return }
    if (file.size > 5 * 1024 * 1024) { setPdfError('El PDF no puede superar 5MB'); return }
    setPdfFile(file); setPdfError(''); setIsParsingPDF(true)
    try {
      const base64 = await toBase64(file)
      const response = await fetch('/api/parse-icp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pdfBase64: base64 }) })
      if (!response.ok) throw new Error('Error del servidor al procesar el PDF')
      const icp = await response.json()
      setFormData(prev => ({
        ...prev,
        industries: icp.industries?.length ? icp.industries : prev.industries,
        excludedIndustries: icp.excludedIndustries?.length ? icp.excludedIndustries : prev.excludedIndustries,
        titles: icp.titles?.length ? icp.titles : prev.titles,
        excludedTitles: icp.excludedTitles?.length ? icp.excludedTitles : prev.excludedTitles,
        country: icp.country || prev.country,
        employeesMin: icp.employeesMin || prev.employeesMin,
        seniorities: icp.seniorities?.length ? icp.seniorities : prev.seniorities
      }))
    } catch (e: any) { setPdfError(e.message || 'Error al procesar el PDF'); setPdfFile(null) }
    finally { setIsParsingPDF(false) }
  }

  const handleSubmit = async () => {
    if (!canSubmit) return
    setIsSubmitting(true)
    const payload: CampaignPayload = {
      tenant_id: user.email || 'default',
      icp_run_id: crypto.randomUUID(),
      campaign_name: campaignName || ('Campana ' + new Date().toLocaleDateString('es-CL')),
      icp: {
        payload: {
          industries: formData.industries,
          excluded_industries: formData.excludedIndustries,
          titles: formData.titles,
          excluded_titles: formData.excludedTitles,
          country: formData.country,
          employees_min: formData.employeesMin,
          seniorities: formData.seniorities
        }
      },
      user: { id: user.id, email: user.email || '' }
    }
    if (webhookUrl) { try { await fetch(webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }) } catch (e) { console.warn('Webhook not reachable:', e) } }
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsSubmitting(false)
    onCampaignSent(payload)
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-700/30 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center"><Zap size={14} className="text-slate-900" /></div><span className="text-sm font-bold text-white tracking-tight">LeadFlow</span></div>
          <div className="flex items-center gap-3"><span className="text-xs text-slate-500 hidden sm:block">{user.email}</span><button onClick={onLogout} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-slate-800/50"><LogOut size={15} /></button></div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8"><h1 className="text-xl font-bold text-white mb-1">Nueva campana de leads</h1><p className="text-sm text-slate-400">Define tu ICP y enviaremos la busqueda a Apollo automaticamente</p></div>
        <div className="space-y-5">
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5"><Sparkles size={12} className="text-emerald-400" /> Detectar ICP desde PDF <span className="text-slate-600">(opcional)</span></label>
            {!pdfFile ? (
              <div onClick={() => fileInputRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handlePDFUpload(f) }} className="border-2 border-dashed border-slate-700/60 hover:border-emerald-500/40 rounded-lg p-5 text-center cursor-pointer transition-all group">
                <FileText size={20} className="mx-auto mb-2 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                <p className="text-sm text-slate-500 group-hover:text-slate-400 transition-colors">Sube un PDF con tu ICP y lo detectamos automaticamente</p>
                <p className="text-xs text-slate-600 mt-1">Arrastra o haz click - Max 5MB</p>
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={e => { if (e.target.files?.[0]) handlePDFUpload(e.target.files[0]) }} />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                {isParsingPDF ? <Loader2 size={16} className="text-emerald-400 animate-spin shrink-0" /> : <FileText size={16} className="text-emerald-400 shrink-0" />}
                <span className="text-sm text-emerald-300 flex-1 truncate">{isParsingPDF ? 'Analizando ICP...' : ('ICP detectado desde ' + pdfFile.name)}</span>
                <button onClick={() => { setPdfFile(null); setPdfError('') }} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={14} /></button>
              </div>
            )}
            {pdfError && <p className="text-xs text-red-400 mt-1.5">{pdfError}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase">Nombre de campana <span className="text-slate-600">(opcional)</span></label>
            <input value={campaignName} onChange={e => setCampaignName(e.target.value)} placeholder="Ej: Marketing Chile Q3" className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm outline-none placeholder-slate-500 focus:border-emerald-400/50 transition-all" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5"><Building2 size={12} /> Industrias <span className="text-emerald-400">*</span></label>
            <TagInput tags={formData.industries} placeholder="Escribe y presiona Enter..." suggestions={INDUSTRY_SUGGESTIONS} onAdd={t => setFormData(p => ({ ...p, industries: [...p.industries, t] }))} onRemove={i => setFormData(p => ({ ...p, industries: p.industries.filter((_, idx) => idx !== i) }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5"><Ban size={12} className="text-red-400/70" /> Industrias a excluir <span className="text-slate-600">(opcional)</span></label>
            <TagInput tags={formData.excludedIndustries} placeholder="Ej: Banking, Oil & Gas..." suggestions={INDUSTRY_SUGGESTIONS} onAdd={t => setFormData(p => ({ ...p, excludedIndustries: [...p.excludedIndustries, t] }))} onRemove={i => setFormData(p => ({ ...p, excludedIndustries: p.excludedIndustries.filter((_, idx) => idx !== i) }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5"><Users size={12} /> Cargos objetivo <span className="text-emerald-400">*</span></label>
            <TagInput tags={formData.titles} placeholder="Ej: CMO, Marketing Manager..." suggestions={TITLE_SUGGESTIONS} onAdd={t => setFormData(p => ({ ...p, titles: [...p.titles, t] }))} onRemove={i => setFormData(p => ({ ...p, titles: p.titles.filter((_, idx) => idx !== i) }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5"><Ban size={12} className="text-red-400/70" /> Cargos a excluir <span className="text-slate-600">(opcional)</span></label>
            <TagInput tags={formData.excludedTitles} placeholder="Ej: Intern, Assistant..." suggestions={TITLE_SUGGESTIONS} onAdd={t => setFormData(p => ({ ...p, excludedTitles: [...p.excludedTitles, t] }))} onRemove={i => setFormData(p => ({ ...p, excludedTitles: p.excludedTitles.filter((_, idx) => idx !== i) }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5"><Globe size={12} /> Pais <span className="text-emerald-400">*</span></label>
              <div className="relative"><select value={formData.country} onChange={e => setFormData(p => ({ ...p, country: e.target.value }))} className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm outline-none appearance-none focus:border-emerald-400/50 transition-all cursor-pointer">{COUNTRIES.map(c => <option key={c} value={c} className="bg-slate-800">{c}</option>)}</select><ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase flex items-center gap-1.5"><Target size={12} /> Empleados minimos</label>
              <input type="number" value={formData.employeesMin} onChange={e => setFormData(p => ({ ...p, employeesMin: parseInt(e.target.value) || 0 }))} className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm outline-none focus:border-emerald-400/50 transition-all font-mono" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 mb-2 block tracking-wide uppercase">Nivel de seniority</label>
            <div className="flex flex-wrap gap-2">{SENIORITIES.map(s => (<button key={s.value} onClick={() => toggleSeniority(s.value)} className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ' + (formData.seniorities.includes(s.value) ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300')}>{s.label}</button>))}</div>
          </div>
          <div className="pt-3">
            <button onClick={handleSubmit} disabled={!canSubmit || isSubmitting || isParsingPDF} className={'w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ' + (canSubmit && !isSubmitting && !isParsingPDF ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 hover:shadow-xl hover:shadow-emerald-500/20 active:scale-[0.98] cursor-pointer' : 'bg-slate-800/50 text-slate-600 border border-slate-700/30 cursor-not-allowed')}>
              {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Enviando a n8n...</> : isParsingPDF ? <><Loader2 size={16} className="animate-spin" /> Detectando ICP...</> : <><Send size={15} /> Lanzar campana</>}
            </button>
            {!canSubmit && !isSubmitting && !isParsingPDF && <p className="text-[11px] text-slate-600 mt-2 text-center">Agrega al menos una industria y un cargo para continuar</p>}
          </div>
        </div>
      </main>
    </div>
  )
                }
