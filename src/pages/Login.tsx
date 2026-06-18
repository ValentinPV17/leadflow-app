import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, ArrowRight, Zap, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)

  const handleSubmit = async () => {
    if (!email || !password) { setError('Ingresa email y contraseña'); return }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }

    setLoading(true)
    setError('')

    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(
        authError.message === 'Invalid login credentials'
          ? 'Email o contraseña incorrectos'
          : authError.message === 'User already registered'
          ? 'Este email ya está registrado. Intenta iniciar sesión.'
          : authError.message
      )
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Zap size={18} className="text-slate-900" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">LeadFlow</span>
          </div>
          <p className="text-sm text-slate-400">Generación de leads automatizada con IA</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-6 shadow-2xl shadow-black/30 animate-fade-up stagger-1">
          <h2 className="text-base font-semibold text-white mb-5">
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>

          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase">Email</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-lg focus-within:border-emerald-400/50 focus-within:shadow-[0_0_0_3px_rgba(52,211,153,0.06)] transition-all">
                <Mail size={15} className="text-slate-500 shrink-0" />
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="tu@empresa.cl"
                  className="w-full bg-transparent text-white text-sm outline-none placeholder-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block tracking-wide uppercase">Contraseña</label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-800/60 border border-slate-600/40 rounded-lg focus-within:border-emerald-400/50 focus-within:shadow-[0_0_0_3px_rgba(52,211,153,0.06)] transition-all">
                <Lock size={15} className="text-slate-500 shrink-0" />
                <input
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-white text-sm outline-none placeholder-slate-500"
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-2.5 mt-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-semibold text-sm rounded-lg hover:shadow-lg hover:shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Cargando...</>
                : <>{isSignUp ? 'Crear cuenta' : 'Entrar'} <ArrowRight size={15} /></>
              }
            </button>

            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="w-full text-xs text-slate-500 hover:text-slate-300 transition-colors mt-2"
            >
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6 animate-fade-up stagger-3">
          MindLytics © 2026
        </p>
      </div>
    </div>
  )
}
