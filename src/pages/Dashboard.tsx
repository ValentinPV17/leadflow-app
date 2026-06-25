import { useState, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CampaignPayload } from '../App'
import TagInput from '../components/TagInput'
import { parseICPFromText } from '../lib/openai'
import { extractTextFromPDF } from '../lib/pdfExtract'
import {
  Send, Zap, LogOut, Building2, Users, Globe, Target,
  Loader2, Sparkles, X, ChevronRight, RotateCcw,
  FileText, Upload
} from 'lucide-react'

const COUNTRIES = [
  'Chile', 'Argentina', 'Colombia', 'México', 'Perú', 'Brasil',
  'Estados Unidos', 'España', 'Uruguay', 'Ecuador', 'Bolivia',
  'Paraguay', 'Costa Rica', 'Panamá', 'Venezuela', 'Guatemala',
]

const SENIORITIES = [
  { value: 'c_suite', label: 'C-Suite' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'head', label: 'Head' },
  { value: 'manager', label: 'Manager' },
  { value: 'senior', label: 'Senior' },
  { value: 'entry', label: 'Entry' },
]

const INDUSTRY_SUGGESTIONS = [
  'SaaS', 'Marketing & Advertising', 'E-commerce', 'Fintech',
  'Healthcare', 'Education', 'Real Estate', 'Logistics',
  'Manufacturing', 'Retail', 'Consulting', 'Technology',
]
const TITLE_SUGGESTIONS = [
  'CEO', 'CMO', 'CTO', 'CFO', 'VP Marketing', 'Marketing Manager',
  'Brand Manager', 'Growth Manager', 'Head of Marketing',
  'Director of Sales', 'Business Development', 'Product Manager',
]

const AI_SUGGESTIONS = [
  '"CMOs y directores de marketing en empresas SaaS de Chile con más de 100 empleados"',
  '"CEOs de startups fintech en Argentina y Colombia"',
  '"VP de ventas en empresas de logística de México con más de 200 empleados"',
  '"Gerentes de marketing en e-commerce de Latinoamérica"',
]

const EMPLOYEE_RANGES = [
  { value: '1,10',         label: '1-10' },
  { value: '11,20',        label: '11-20' },
  { value: '21,50',        label: '21-50' },
  { value: '51,100',       label: '51-100' },
  { value: '101,200',      label: '101-200' },
  { value: '201,500',      label: '201-500' },
  { value: '501,1000',     label: '501-1000' },
  { value: '1001,5000',    label: '1001-5000' },
  { value: '5001,10000',   label: '5001-10000' },
  { value: '10001,100000', label: '10001+' },
]

interface FormData {
  industries: string[]
  titles: string[]
  countries: string[]
  employeeRanges: string[]
  seniorities: string[]
}

interface Props {
  user: User
  onLogout: () => void
  onCampaignSent: (payload: CampaignPayload) => void
  onHistory: () => void
  onIntegrations: () => void
}

type Mode = 'ai' | 'manual'

export default function Dashboard({ user, onLogout, onCampaignSent, onHistory, onIntegrations }: Props) {
  const [mode, setMode] = useState<Mode>('ai')
  const [aiText, setAiText] = useState('')
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [isExtractingPDF, setIsExtractingPDF] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [formData, setFormData] = useState<FormData>({
    industries: [],
    titles: [],
    countries: ['Chile'],
    employeeRanges: ['101,200', '201,500', '501,1000'],
    seniorities: ['director', 'manager'],
  })
  const [aiParsed, setAiParsed] = useState(false)

  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || ''
  const canSubmit = formData.titles.length > 0 && formData.industries.length > 0 && formData.countries.length > 0

  const handleAIParse = async () => {
    if (!aiText.trim()) return
    setIsParsing(true)
    setParseError('')
    try {
      const parsed = await parseICPFromText(aiText)
      setFormData({
        industries: parsed.industries,
        titles: parsed.titles,
        countries: parsed.countries,
        employeeRanges: parsed.employee_ranges,
        seniorities: parsed.seniorities,
      })
      setAiParsed(true)
      setMode('manual')
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Error al analizar el texto')
    } finally {
      setIsParsing(false)
    }
  }

  const handlePDFUpload = async (file: File) => {
    setPdfFile(file)
    setIsExtractingPDF(true)
    setParseError('')
    try {
      const text = await extractTextFromPDF(file)
      if (!text) throw new Error('No se pudo extraer texto del PDF')
      setAiText(text.slice(0, 2000))
    } catch (e: unknown) {
      setParseError(e instanceof Error ? e.message : 'Error al leer el PDF')
      setPdfFile(null)
    } finally {
      setIsExtractingPDF(false)
    }
  }

  const handleReset = () => {
    setAiParsed(false)
    setAiText('')
    setPdfFile(null)
    setMode('ai')
    setFormData({ industries: [], titles: [], countries: ['Chile'], employeeRanges: ['101,200', '201,500', '501,1000'], seniorities: ['director', 'manager'] })
  }

  const toggleEmployeeRange = (v: string) => {
    setFormData(prev => ({
      ...prev,
      employeeRanges: prev.employeeRanges.includes(v)
        ? prev.employeeRanges.filter(r => r !== v)
        : [...prev.employeeRanges, v],
    }))
  }

  const toggleSeniority = (v: string) => {
    setFormData(prev => ({
      ...prev,
      seniorities: prev.seniorities.includes(v)
        ? prev.seniorities.filter(s => s !== v)
        : [...prev.seniorities, v],
    }))
  }

  const toggleCountry = (c: string) => {
    setFormData(prev => ({
      ...prev,
      countries: prev.countries.includes(c)
        ? prev.countries.filter(x => x !== c)
        : [...prev.countries, c],
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
          countries: formData.countries,
          employee_ranges: formData.employeeRanges,
          seniorities: formData.seniorities,
        },
      },
      user: { id: user.id, email: user.email || '' },
    }

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
          <div className="flex items-center gap-2">
            <button
              onClick={onIntegrations}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 border border-slate-700/50 rounded-lg hover:border-slate-500 hover:text-slate-200 transition-all"
            >
              Integraciones
            </button>
            <button
              onClick={onHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 border border-slate-700/50 rounded-lg hover:border-slate-500 hover:text-slate-200 transition-all"
            >
              Historial
            </button>
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

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Title */}
        <div className="animate-fade-up">
          <h1 className="text-xl font-bold text-white mb-1">Nueva campaña de leads</h1>
          <p className="text-sm text-slate-400">Describí tu cliente ideal en lenguaje natural y la IA configurará la búsqueda automáticamente</p>
        </div>

        {/* AI Input */}
        <div className="animate-fade-up stagger-1">
          <div className={`relative rounded-xl border transition-all duration-300 ${
            mode === 'ai'
              ? 'border-emerald-500/40 bg-slate-800/60 shadow-[0_0_24px_rgba(52,211,153,0.08)]'
              : 'border-slate-700/40 bg-slate-800/30'
          }`}>
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
              <Sparkles size={15} className="text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Búsqueda con IA</span>
              {aiParsed && (
                <button
                  onClick={handleReset}
                  className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  <RotateCcw size={11} /> Nueva búsqueda
                </button>
              )}
            </div>

            <div className="px-4 pb-4">
              {/* PDF indicator */}
              {pdfFile && (
                <div className="flex items-center gap-2 mb-3 bg-slate-700/40 border border-slate-600/40 rounded-lg px-3 py-2">
                  <FileText size={13} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-slate-300 flex-1 truncate">{pdfFile.name}</span>
                  {isExtractingPDF
                    ? <Loader2 size={12} className="animate-spin text-emerald-400" />
                    : <button onClick={() => { setPdfFile(null); setAiText('') }} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={12} /></button>
                  }
                </div>
              )}

              <textarea
                value={aiText}
                onChange={e => { setAiText(e.target.value); setAiParsed(false) }}
                onFocus={() => setMode('ai')}
                placeholder={pdfFile ? 'Texto extraído del PDF (podés editar)...' : 'Ej: Quiero encontrar CMOs y directores de marketing en empresas SaaS de Chile con más de 100 empleados...'}
                rows={3}
                disabled={isParsing || isExtractingPDF}
                className="w-full bg-transparent text-sm text-white placeholder-slate-500 outline-none resize-none leading-relaxed"
              />

              {parseError && (
                <div className="flex items-center gap-2 mt-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  <X size={12} /> {parseError}
                </div>
              )}

              {/* Suggestions */}
              {!aiText && !aiParsed && !pdfFile && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium">Ejemplos</p>
                  <div className="space-y-1">
                    {AI_SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setAiText(s.replace(/"/g, ''))}
                        className="w-full text-left text-xs text-slate-400 hover:text-slate-200 py-1.5 px-2 rounded-lg hover:bg-slate-700/40 transition-all flex items-center gap-2 group"
                      >
                        <ChevronRight size={11} className="text-slate-600 group-hover:text-emerald-400 flex-shrink-0 transition-colors" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/40">
                <div className="flex items-center gap-2">
                  {/* PDF upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handlePDFUpload(f) }}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing || isExtractingPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-400 border border-slate-700/50 hover:border-slate-500 hover:text-slate-200 transition-all disabled:opacity-40"
                    title="Subir PDF con descripción del ICP"
                  >
                    <Upload size={11} /> Subir PDF
                  </button>
                  <span className="text-[11px] text-slate-600">
                    {aiText.length > 0 ? `${aiText.length} chars` : 'GPT-4o mini'}
                  </span>
                </div>
                <button
                  onClick={handleAIParse}
                  disabled={!aiText.trim() || isParsing || isExtractingPDF}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    aiText.trim() && !isParsing && !isExtractingPDF
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-slate-800 text-slate-600 border border-slate-700/30 cursor-not-allowed'
                  }`}
                >
                  {isParsing
                    ? <><Loader2 size={12} className="animate-spin" /> Analizando...</>
                    : <><Sparkles size={12} /> Analizar</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Parsed result indicator */}
        {aiParsed && (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 animate-fade-up">
            <Sparkles size={12} />
            ICP detectado automáticamente — revisá y ajustá los campos si es necesario
          </div>
        )}

        {/* Manual form — always visible, populated by AI */}
        <div className="space-y-5">

          {/* Campaign name */}
          <div className="animate-fade-up stagger-2">
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

          {/* Countries — multi select */}
          <div className="animate-fade-up stagger-4">
            <label className="text-xs font-medium text-slate-400 mb-2 block tracking-wide uppercase flex items-center gap-1.5">
              <Globe size={12} /> Países <span className="text-emerald-400">*</span>
              <span className="text-slate-600 normal-case font-normal">(seleccioná uno o más)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCountry(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    formData.countries.includes(c)
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.1)]'
                      : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Employee ranges */}
          <div className="animate-fade-up stagger-4">
            <label className="text-xs font-medium text-slate-400 mb-2 block tracking-wide uppercase flex items-center gap-1.5">
              <Target size={12} /> Rango de empleados
              <span className="text-slate-600 normal-case font-normal">(seleccioná uno o más)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {EMPLOYEE_RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => toggleEmployeeRange(r.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    formData.employeeRanges.includes(r.value)
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.1)]'
                      : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Seniority */}
          <div className="animate-fade-up stagger-4">
            <label className="text-xs font-medium text-slate-400 mb-2 block tracking-wide uppercase">Seniority</label>
            <div className="flex flex-wrap gap-1.5">
              {SENIORITIES.map(s => (
                <button
                  key={s.value}
                  onClick={() => toggleSeniority(s.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200 border ${
                    formData.seniorities.includes(s.value)
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-800/30 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2 animate-fade-up stagger-5">
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
                ? <><Loader2 size={16} className="animate-spin" /> Buscando en Apollo...</>
                : <><Send size={15} /> Buscar leads en Apollo</>
              }
            </button>
            {!canSubmit && !isSubmitting && (
              <p className="text-[11px] text-slate-600 mt-2 text-center">
                Agrega al menos una industria, un cargo y un país para continuar
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
