import { useState, useRef, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import type { CampaignPayload } from '../App'
import TagInput from '../components/TagInput'
import { parseICPFromText } from '../lib/openai'
import { extractTextFromPDF } from '../lib/pdfExtract'
import {
  Send, Zap, LogOut, Building2, Users, Globe, Target,
  ChevronDown, Loader2, Sparkles, X, ChevronRight, RotateCcw,
  FileText, Upload, Check, Settings, History, SlidersHorizontal
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
  onSwipe: () => void
  hasResults?: boolean
  onResumeResults?: () => void
}

type Mode = 'ai' | 'manual'

export default function Dashboard({ user, onLogout, onCampaignSent, onHistory, onIntegrations, onSwipe, hasResults, onResumeResults }: Props) {
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
  const [rangeDropdownOpen, setRangeDropdownOpen] = useState(false)
  const rangeDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rangeDropdownRef.current && !rangeDropdownRef.current.contains(e.target as Node)) {
        setRangeDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || ''
  const canSubmit = formData.titles.length > 0 && formData.industries.length > 0 && formData.countries.length > 0

  const activeFiltersCount = [
    formData.industries.length > 0,
    formData.titles.length > 0,
    formData.countries.length > 0,
    formData.employeeRanges.length > 0,
    formData.seniorities.length > 0,
  ].filter(Boolean).length

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
      <header className="border-b border-slate-700/30 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap size={15} className="text-slate-900" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">LeadFlow</span>
          </div>
          <nav className="flex items-center gap-1.5">
            <button
              onClick={onSwipe}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-emerald-500/15 to-cyan-500/15 border border-emerald-500/25 text-emerald-300 rounded-lg hover:from-emerald-500/25 hover:to-cyan-500/25 transition-all"
            >
              <span>✦</span>
              <span className="hidden sm:inline">Match:</span>
            </button>
            <button
              onClick={onIntegrations}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 rounded-lg hover:bg-slate-800/60 hover:text-slate-200 transition-all"
            >
              <Settings size={13} />
              <span className="hidden sm:inline">Integraciones</span>
            </button>
            <button
              onClick={onHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 rounded-lg hover:bg-slate-800/60 hover:text-slate-200 transition-all"
            >
              <History size={13} />
              <span className="hidden sm:inline">Historial</span>
            </button>
            <div className="w-px h-4 bg-slate-700/60 mx-1" />
            <span className="text-xs text-slate-500 hidden sm:block max-w-36 truncate">{user.email}</span>
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-slate-800/50"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Resume results banner */}
        {hasResults && onResumeResults && (
          <button
            onClick={onResumeResults}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/15 transition-all group animate-fade-up"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-emerald-300 font-medium">Tenés resultados activos</span>
            </div>
            <span className="text-xs text-emerald-400/70 group-hover:text-emerald-400 transition-colors flex items-center gap-1">
              Ver resultados →
            </span>
          </button>
        )}

        {/* Title + Step indicator */}
        <div className="animate-fade-up">
          <h1 className="text-xl font-bold text-white mb-1">Nueva campaña de leads</h1>
          <p className="text-sm text-slate-400 mb-4">Describí tu cliente ideal y la IA configurará la búsqueda automáticamente</p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className={`flex items-center gap-1.5 transition-colors ${!aiParsed ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${!aiParsed ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>1</span>
              Describe tu ICP
            </span>
            <ChevronRight size={12} className="text-slate-700" />
            <span className={`flex items-center gap-1.5 transition-colors ${aiParsed && !canSubmit ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${aiParsed && !canSubmit ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>2</span>
              Ajusta filtros
            </span>
            <ChevronRight size={12} className="text-slate-700" />
            <span className={`flex items-center gap-1.5 transition-colors ${canSubmit ? 'text-emerald-400' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${canSubmit ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-400' : 'border-slate-700 bg-slate-800 text-slate-500'}`}>3</span>
              Busca
            </span>
          </div>
        </div>

        {/* AI Input Card */}
        <div className="animate-fade-up stagger-1">
          <div className={`relative rounded-xl border transition-all duration-300 ${
            mode === 'ai'
              ? 'border-emerald-500/40 bg-slate-800/60 shadow-[0_0_32px_rgba(52,211,153,0.08)]'
              : 'border-slate-700/40 bg-slate-800/30'
          }`}>
            <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-slate-700/30">
              <div className="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <Sparkles size={12} className="text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Búsqueda con IA</span>
              <span className="text-[10px] text-slate-600 font-normal normal-case ml-1">GPT-4o mini</span>
              {aiParsed && (
                <button
                  onClick={handleReset}
                  className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors bg-slate-800/60 border border-slate-700/40 px-2 py-1 rounded-md"
                >
                  <RotateCcw size={11} /> Nueva búsqueda
                </button>
              )}
            </div>

            <div className="px-4 pb-4 pt-3">
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
                  {aiText.length > 0 && (
                    <span className="text-[11px] text-slate-600">{aiText.length} chars</span>
                  )}
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
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5 animate-fade-up">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles size={10} />
            </div>
            ICP detectado automáticamente — revisá y ajustá los campos si es necesario
          </div>
        )}

        {/* Manual filters — always visible */}
        <div className="space-y-4">

          {/* Section header */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-slate-500" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filtros de búsqueda</span>
            </div>
            {activeFiltersCount > 0 && (
              <span className="text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-full px-2 py-0.5">
                {activeFiltersCount} activos
              </span>
            )}
          </div>

          {/* Campaign name */}
          <div className="animate-fade-up stagger-2 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-slate-700/60 flex items-center justify-center">
                <FileText size={12} className="text-slate-400" />
              </div>
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Nombre de campaña
              </label>
              <span className="text-[10px] text-slate-600 font-normal normal-case">(opcional)</span>
            </div>
            <input
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              placeholder="Ej: Marketing Chile Q3"
              className="w-full px-3 py-2.5 bg-slate-900/50 border border-slate-600/40 rounded-lg text-white text-sm outline-none placeholder-slate-600 focus:border-emerald-400/50 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.06)] transition-all"
            />
          </div>

          {/* Industries */}
          <div className="animate-fade-up stagger-2 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 relative z-[50]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-slate-700/60 flex items-center justify-center">
                <Building2 size={12} className="text-slate-400" />
              </div>
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase flex items-center gap-1">
                Industrias <span className="text-emerald-400">*</span>
              </label>
              {formData.industries.length > 0 && (
                <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                  {formData.industries.length} seleccionadas
                </span>
              )}
            </div>
            <TagInput
              tags={formData.industries}
              placeholder="Escribe y presiona Enter..."
              suggestions={INDUSTRY_SUGGESTIONS}
              onAdd={t => setFormData(p => ({ ...p, industries: [...p.industries, t] }))}
              onRemove={i => setFormData(p => ({ ...p, industries: p.industries.filter((_, idx) => idx !== i) }))}
            />
          </div>

          {/* Titles */}
          <div className="animate-fade-up stagger-3 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 relative z-[40]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-slate-700/60 flex items-center justify-center">
                <Users size={12} className="text-slate-400" />
              </div>
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase flex items-center gap-1">
                Cargos objetivo <span className="text-emerald-400">*</span>
              </label>
              {formData.titles.length > 0 && (
                <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                  {formData.titles.length} seleccionados
                </span>
              )}
            </div>
            <TagInput
              tags={formData.titles}
              placeholder="Ej: CMO, Marketing Manager..."
              suggestions={TITLE_SUGGESTIONS}
              onAdd={t => setFormData(p => ({ ...p, titles: [...p.titles, t] }))}
              onRemove={i => setFormData(p => ({ ...p, titles: p.titles.filter((_, idx) => idx !== i) }))}
            />
          </div>

          {/* Countries */}
          <div className="animate-fade-up stagger-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 relative z-[30]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-slate-700/60 flex items-center justify-center">
                <Globe size={12} className="text-slate-400" />
              </div>
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase flex items-center gap-1">
                Países <span className="text-emerald-400">*</span>
              </label>
              <span className="text-[10px] text-slate-600 font-normal normal-case">(seleccioná uno o más)</span>
              {formData.countries.length > 0 && (
                <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                  {formData.countries.length} seleccionados
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCountry(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    formData.countries.includes(c)
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.1)]'
                      : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Employee ranges */}
          <div className="animate-fade-up stagger-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 relative z-[20]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-slate-700/60 flex items-center justify-center">
                <Target size={12} className="text-slate-400" />
              </div>
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
                Rango de empleados
              </label>
            </div>
            <div className="relative z-50" ref={rangeDropdownRef}>
              <button
                onClick={() => setRangeDropdownOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-900/50 border border-slate-600/40 rounded-lg text-sm transition-all hover:border-slate-500 focus:border-emerald-400/50"
              >
                <span className={formData.employeeRanges.length ? 'text-white' : 'text-slate-500'}>
                  {formData.employeeRanges.length === 0
                    ? 'Seleccionar rangos...'
                    : formData.employeeRanges.length === EMPLOYEE_RANGES.length
                      ? 'Todos los rangos'
                      : EMPLOYEE_RANGES.filter(r => formData.employeeRanges.includes(r.value)).map(r => r.label).join(', ')
                  }
                </span>
                <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${rangeDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {rangeDropdownOpen && (
                <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700/60 rounded-lg shadow-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto py-1">
                    {EMPLOYEE_RANGES.map(r => {
                      const selected = formData.employeeRanges.includes(r.value)
                      return (
                        <button
                          key={r.value}
                          onClick={() => toggleEmployeeRange(r.value)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-700/50 transition-colors"
                        >
                          <div className={`w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-all ${
                            selected
                              ? 'bg-emerald-500 border-emerald-500'
                              : 'border-slate-600 bg-slate-900/50'
                          }`}>
                            {selected && <Check size={10} className="text-slate-900 stroke-[3]" />}
                          </div>
                          <span className={selected ? 'text-white' : 'text-slate-400'}>{r.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="border-t border-slate-700/60 px-3 py-2 flex justify-between items-center">
                    <span className="text-xs text-slate-500">{formData.employeeRanges.length} seleccionados</span>
                    <button
                      onClick={() => setFormData(p => ({ ...p, employeeRanges: formData.employeeRanges.length === EMPLOYEE_RANGES.length ? [] : EMPLOYEE_RANGES.map(r => r.value) }))}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      {formData.employeeRanges.length === EMPLOYEE_RANGES.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Seniority */}
          <div className="animate-fade-up stagger-4 bg-slate-800/40 border border-slate-700/30 rounded-xl p-5 relative z-[10]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-slate-700/60 flex items-center justify-center">
                <Users size={12} className="text-slate-400" />
              </div>
              <label className="text-xs font-semibold text-slate-300 tracking-wide uppercase">Seniority</label>
              {formData.seniorities.length > 0 && (
                <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
                  {formData.seniorities.length} seleccionados
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {SENIORITIES.map(s => (
                <button
                  key={s.value}
                  onClick={() => toggleSeniority(s.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    formData.seniorities.includes(s.value)
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-slate-900/40 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
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
              className={`w-full py-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all duration-300 ${
                canSubmit && !isSubmitting
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 hover:shadow-2xl hover:shadow-emerald-500/25 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
                  : 'bg-slate-800/50 text-slate-600 border border-slate-700/30 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <><Loader2 size={17} className="animate-spin" /> Buscando en Apollo...</>
              ) : (
                <>
                  <Send size={16} />
                  Buscar leads en Apollo
                  {activeFiltersCount > 0 && canSubmit && (
                    <span className="ml-1 text-[10px] font-bold bg-slate-900/30 rounded-full px-2 py-0.5">
                      {activeFiltersCount} filtros
                    </span>
                  )}
                </>
              )}
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
