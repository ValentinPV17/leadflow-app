import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { testHubSpotConnection } from '../lib/hubspot'
import {
  Zap, LogOut, CheckCircle2, XCircle, Loader2,
  Eye, EyeOff, Plug, Unplug
} from 'lucide-react'

interface Props {
  user: User
  onLogout: () => void
  onBack: () => void
}

export default function Integrations({ user, onLogout, onBack }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [savedKey, setSavedKey] = useState<string | null>(null)
  const [connectedAt, setConnectedAt] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadIntegration()
  }, [])

  const loadIntegration = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('integrations')
      .select('credentials_encrypted, created_at')
      .eq('created_by', user.id)
      .eq('provider', 'hubspot')
      .maybeSingle()

    if (data?.credentials_encrypted) {
      try {
        const parsed = JSON.parse(data.credentials_encrypted)
        setSavedKey(parsed.api_key ?? data.credentials_encrypted)
      } catch {
        setSavedKey(data.credentials_encrypted)
      }
      setConnectedAt(data.created_at)
    }
    setLoading(false)
  }

  const handleTest = async () => {
    const keyToTest = apiKey || savedKey
    if (!keyToTest) return
    setIsTesting(true)
    setTestResult(null)
    const ok = await testHubSpotConnection(keyToTest)
    setTestResult(ok ? 'ok' : 'fail')
    setIsTesting(false)
  }

  const handleSave = async () => {
    if (!apiKey.trim()) return
    setIsSaving(true)
    setTestResult(null)

    // Test first
    const ok = await testHubSpotConnection(apiKey.trim())
    if (!ok) {
      setTestResult('fail')
      setIsSaving(false)
      return
    }

    // Get tenant_id for this user
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('created_by', user.id)
      .maybeSingle()

    const tenantId = tenant?.id ?? null

    // Delete existing and re-insert (no unique constraint to upsert on)
    await supabase.from('integrations').delete()
      .eq('created_by', user.id).eq('provider', 'hubspot')

    const { error } = await supabase
      .from('integrations')
      .insert({
        tenant_id: tenantId,
        provider: 'hubspot',
        credentials_encrypted: JSON.stringify({ api_key: apiKey.trim() }),
        created_by: user.id,
      })

    if (!error) {
      setSavedKey(apiKey.trim())
      setConnectedAt(new Date().toISOString())
      setApiKey('')
      setTestResult('ok')
    }
    setIsSaving(false)
  }

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar HubSpot? Los leads ya guardados no se borrarán.')) return
    await supabase
      .from('integrations')
      .delete()
      .eq('created_by', user.id)
      .eq('provider', 'hubspot')
    setSavedKey(null)
    setConnectedAt(null)
    setTestResult(null)
  }

  const maskedKey = (key: string) => key.slice(0, 8) + '••••••••••••••••' + key.slice(-4)

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-700/30 bg-slate-900/40 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center">
              <Zap size={14} className="text-slate-900" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">LeadFlow</span>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-slate-400">Integraciones</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onBack} className="text-xs text-slate-400 hover:text-white border border-slate-700/50 rounded-lg px-3 py-1.5 transition-all hover:border-slate-500">
              ← Volver
            </button>
            <button onClick={onLogout} className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-slate-800/50">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="animate-fade-up">
          <h1 className="text-xl font-bold text-white mb-1">Integraciones</h1>
          <p className="text-sm text-slate-400">Conectá tus herramientas para que LeadFlow no te entregue contactos que ya tenés</p>
        </div>

        {/* HubSpot Card */}
        <div className="animate-fade-up stagger-1 bg-slate-800/30 border border-slate-700/40 rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* HubSpot logo */}
              <div className="w-9 h-9 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
                <span className="text-orange-400 font-bold text-sm">Hs</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">HubSpot CRM</p>
                <p className="text-xs text-slate-500">Evita duplicados de contactos</p>
              </div>
            </div>
            {!loading && (
              savedKey ? (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
                  <CheckCircle2 size={12} /> Conectado
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5">
                  <XCircle size={12} /> No conectado
                </div>
              )
            )}
          </div>

          <div className="px-5 py-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin text-slate-500" />
              </div>
            ) : savedKey ? (
              /* Connected state */
              <div className="space-y-4">
                <div className="bg-slate-900/60 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">API Key</span>
                    <button onClick={() => setShowKey(!showKey)} className="text-slate-500 hover:text-slate-300 transition-colors">
                      {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                  <p className="text-slate-300 text-sm font-mono">
                    {showKey ? savedKey : maskedKey(savedKey)}
                  </p>
                  {connectedAt && (
                    <p className="text-xs text-slate-600">Conectado el {formatDate(connectedAt)}</p>
                  )}
                </div>

                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-4 py-3">
                  <p className="text-xs text-emerald-400/80">
                    ✓ Cuando busques leads en Apollo, LeadFlow va a comparar los emails contra tus contactos de HubSpot y marcar los que ya existen para que no los dupliques.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleTest}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs border border-slate-600/50 text-slate-300 rounded-lg hover:border-slate-500 transition-all disabled:opacity-40"
                  >
                    {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Plug size={12} />}
                    Probar conexión
                  </button>
                  <button
                    onClick={handleDisconnect}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/10 transition-all"
                  >
                    <Unplug size={12} /> Desconectar
                  </button>
                </div>

                {testResult === 'ok' && (
                  <p className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle2 size={12} /> Conexión exitosa
                  </p>
                )}
                {testResult === 'fail' && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400">
                    <XCircle size={12} /> No se pudo conectar. Verificá tu API key.
                  </p>
                )}
              </div>
            ) : (
              /* Disconnected state */
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-3">
                    Ingresá tu <strong className="text-slate-200">Private App token</strong> de HubSpot. Lo encontrás en:
                    <br />
                    <span className="text-slate-500">HubSpot → Settings → Integrations → Private Apps → Create</span>
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    El token necesita permiso de lectura en <span className="font-mono bg-slate-800 px-1 rounded text-slate-400">crm.objects.contacts.read</span>
                  </p>

                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={e => { setApiKey(e.target.value); setTestResult(null) }}
                      placeholder="pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-600/50 rounded-lg text-white text-sm outline-none placeholder-slate-600 focus:border-emerald-400/50 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.06)] transition-all font-mono pr-10"
                    />
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {testResult === 'fail' && (
                  <p className="flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <XCircle size={12} /> Token inválido o sin permisos suficientes
                  </p>
                )}

                <button
                  onClick={handleSave}
                  disabled={!apiKey.trim() || isSaving}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    apiKey.trim() && !isSaving
                      ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 hover:shadow-lg hover:shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? <><Loader2 size={14} className="animate-spin" /> Verificando...</> : <><Plug size={14} /> Conectar HubSpot</>}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Future integrations placeholder */}
        <div className="animate-fade-up stagger-2 bg-slate-800/15 border border-slate-700/20 rounded-xl px-5 py-4 flex items-center justify-between opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-700/50 border border-slate-600/30 flex items-center justify-center">
              <span className="text-slate-500 font-bold text-sm">Sf</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">Salesforce</p>
              <p className="text-xs text-slate-600">Próximamente</p>
            </div>
          </div>
          <span className="text-xs text-slate-600 border border-slate-700/30 rounded px-2 py-0.5">Próximamente</span>
        </div>

        <div className="animate-fade-up stagger-2 bg-slate-800/15 border border-slate-700/20 rounded-xl px-5 py-4 flex items-center justify-between opacity-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-700/50 border border-slate-600/30 flex items-center justify-center">
              <span className="text-slate-500 font-bold text-sm">Pp</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-400">Pipedrive</p>
              <p className="text-xs text-slate-600">Próximamente</p>
            </div>
          </div>
          <span className="text-xs text-slate-600 border border-slate-700/30 rounded px-2 py-0.5">Próximamente</span>
        </div>
      </main>
    </div>
  )
}
