import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const CONFIG_ERROR = 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.'

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24">
      <path d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.31h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.27-2.09 3.57-5.18 3.57-8.65z" fill="#4285F4" />
      <path d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.87-3c-1.07.72-2.44 1.14-4.08 1.14-3.13 0-5.77-2.11-6.72-4.95H1.28v3.09A12 12 0 0 0 12 24z" fill="#34A853" />
      <path d="M5.28 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.28a12 12 0 0 0 0 10.74l4-3.09z" fill="#FBBC05" />
      <path d="M12 4.77c1.76 0 3.34.6 4.58 1.77l3.44-3.44A11.95 11.95 0 0 0 12 0 12 12 0 0 0 1.28 6.63l4 3.09c.95-2.84 3.59-4.95 6.72-4.95z" fill="#EA4335" />
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const { i18n } = useTranslation()
  const {
    isLoggedIn,
    loading: authLoading,
    hasAuthConfig,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    getPostLoginPath,
  } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Redirect already-authenticated users
  useEffect(() => {
    if (authLoading) return
    if (isLoggedIn) {
      navigate(getPostLoginPath(), { replace: true })
    }
  }, [authLoading, isLoggedIn, navigate, getPostLoginPath])

  const handleAuth = async (event) => {
    event.preventDefault()

    if (!hasAuthConfig) {
      setError(CONFIG_ERROR)
      return
    }

    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      const normalizedEmail = email.trim().toLowerCase()

      if (isRegistering) {
        await signUpWithPassword({
          email: normalizedEmail,
          password,
          fullName: fullName.trim(),
        })
        setSuccessMsg(t('auth.success.created'))
        setIsRegistering(false)
        setPassword('')
      } else {
        const { profile, session } = await signInWithPassword({
          email: normalizedEmail,
          password,
        })
        navigate(getPostLoginPath(profile, session), { replace: true })
      }
    } catch (err) {
      const message = err?.message || t('auth.errors.failed')
      if (isRegistering) {
        if (message.toLowerCase().includes('already registered')) {
          setError(t('auth.errors.alreadyExists'))
          setIsRegistering(false)
          return
        }
      }

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!hasAuthConfig) {
      setError(CONFIG_ERROR)
      return
    }

    setLoading(true)
    setError('')
    setSuccessMsg('')

    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err?.message || t('auth.errors.googleFailed'))
      setLoading(false)
    }
  }

  const switchMode = () => {
    setIsRegistering((prev) => !prev)
    setError('')
    setSuccessMsg('')
  }

  // While auth state is loading, show spinner so we don't flash the form
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-5xl text-primary">sync</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050B14] font-display text-slate-100 relative overflow-x-hidden">
      <div className="fixed inset-0 cyber-grid opacity-40 pointer-events-none" />
      <div className="fixed -top-24 -left-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
      <div className="fixed -bottom-24 -right-20 w-80 h-80 rounded-full bg-neon-purple/20 blur-3xl pointer-events-none" />

      <header className="relative z-10 px-6 py-5 lg:px-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center group-hover:neon-border-cyan transition-all">
            <span className="material-symbols-outlined">bolt</span>
          </div>
          <span className="text-xl font-black tracking-tight">{t('nav.nobitaAi')}</span>
        </Link>

        <div className="flex items-center gap-3">
          <div className="glass rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-bold tracking-wide">
            <button
              type="button"
              onClick={() => i18n.changeLanguage('en')}
              className={i18n.language === 'en' ? 'text-primary' : 'text-slate-400 hover:text-white'}
            >
              EN
            </button>
            <span className="mx-2 text-slate-600">/</span>
            <button
              type="button"
              onClick={() => i18n.changeLanguage('vi')}
              className={i18n.language === 'vi' ? 'text-primary' : 'text-slate-400 hover:text-white'}
            >
              VN
            </button>
          </div>
          <Link to="/" className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
            {t('auth.backHome')}
          </Link>
        </div>
      </header>

      <main className="relative z-10 w-full max-w-6xl mx-auto px-4 pb-10 pt-4 lg:pt-10">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Left panel */}
           <section className="hidden lg:flex glass-panel rounded-2xl border border-slate-700/60 p-8 xl:p-10 flex-col justify-between shadow-[0_0_40px_rgba(37,123,244,0.08)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold mb-5">{t('auth.secureAccess')}</p>
              <h1 className="text-4xl leading-tight font-black mb-5">
                {t('auth.welcomeTitle')}
              </h1>
              <p className="text-slate-300/90 leading-relaxed">
                {t('auth.welcomeSubtitle')}
              </p>
            </div>

            <ul className="space-y-4 mt-10 text-sm">
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary">shield_lock</span>
                <span>{t('auth.features.session')}</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary">manage_accounts</span>
                <span>{t('auth.features.roles')}</span>
              </li>
              <li className="flex gap-3">
                <span className="material-symbols-outlined text-primary">tune</span>
                <span>{t('auth.features.errors')}</span>
              </li>
            </ul>
          </section>

          {/* Right panel — form */}
          <section className="glass-panel rounded-2xl border border-slate-700/60 p-6 sm:p-8 shadow-[0_0_40px_rgba(37,123,244,0.12)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />

            <div className="mb-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-primary font-bold mb-2">
                {isRegistering ? t('auth.createAccount') : t('auth.welcomeBack')}
              </p>
              <h2 className="text-3xl font-black tracking-tight">
                {isRegistering ? t('auth.register') : t('auth.login')}
              </h2>
            </div>

            {!hasAuthConfig && (
              <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-amber-200 text-sm">
                {CONFIG_ERROR}
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-5 rounded-xl border border-green-500/40 bg-green-500/10 px-4 py-3 text-green-300 text-sm">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.15em] text-slate-400 mb-1.5">{t('auth.fullNameLabel')}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={isRegistering}
                    className="w-full rounded-xl bg-[#0a0e14]/90 border border-slate-700/60 px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                    placeholder={t('auth.fullNamePlaceholder')}
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-slate-400 mb-1.5">{t('auth.emailLabel')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-xl bg-[#0a0e14]/90 border border-slate-700/60 px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.15em] text-slate-400 mb-1.5">{t('auth.passwordLabel')}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    className="w-full rounded-xl bg-[#0a0e14]/90 border border-slate-700/60 px-4 py-3.5 pr-11 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                    placeholder={t('auth.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !hasAuthConfig}
                className="w-full mt-2 rounded-xl bg-primary hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3.5 font-bold tracking-wide transition-all neon-border-cyan"
              >
                {loading ? t('auth.processing') : isRegistering ? t('auth.createAccount') : t('auth.login')}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-700" />
              <span className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{t('common.or')}</span>
              <div className="h-px flex-1 bg-slate-700" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading || !hasAuthConfig}
              className="w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/30 disabled:opacity-60 disabled:cursor-not-allowed py-3.5 font-semibold transition-all flex items-center justify-center gap-2.5"
            >
              <GoogleIcon />
              {t('auth.googleLogin')}
            </button>

            <p className="mt-8 text-center text-sm text-slate-400">
              {isRegistering ? t('auth.alreadyHaveAccount') : t('auth.needAccount')}{' '}
              <button type="button" onClick={switchMode} className="font-bold text-primary hover:text-white transition-colors">
                {isRegistering ? t('auth.signInNow') : t('auth.createOne')}
              </button>
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
