import { useTranslation } from 'react-i18next'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'

/** Shared tab styles — active tab gets neon glow + accent color */
function NavTab({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs transition-all border',
          isActive
            ? 'bg-primary/20 text-primary border-primary/50 neon-border-cyan'
            : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10',
        ].join(' ')
      }
    >
      <span className="material-symbols-outlined text-base leading-none">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </NavLink>
  )
}

export default function Header() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { isLoggedIn, isAdmin, loading, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
  }

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true)
      await signOut()
      navigate('/login', { replace: true })
    } catch (err) {
      console.error('Sign out failed:', err)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10 px-4 lg:px-20 py-4">
      <nav className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center neon-border-cyan">
            <span className="material-symbols-outlined text-white text-[18px]">bolt</span>
          </div>
          <span className="text-xl font-bold tracking-tighter text-white hidden sm:inline">
            Nobita <span className="text-primary">AI</span>
          </span>
        </Link>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-8 flex-1 justify-center">
          <Link className="text-sm font-medium hover:text-primary transition-colors text-white" to="/">
            {t('nav.home')}
          </Link>
          <a className="text-sm font-medium hover:text-primary transition-colors text-white" href="#pricing">
            {t('nav.pricing')}
          </a>
          <a className="text-sm font-medium hover:text-primary transition-colors text-white" href="#guide">
            {t('nav.guide')}
          </a>
          <a className="text-sm font-medium hover:text-primary transition-colors text-white" href="#faq">
            {t('nav.faq')}
          </a>
        </div>

        {/* Right area */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Language switcher */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 glass rounded-lg text-[10px] font-bold text-slate-400">
            <button
              type="button"
              onClick={() => changeLanguage('en')}
              className={i18n.language === 'en' ? 'text-primary' : 'hover:text-white'}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => changeLanguage('vi')}
              className={i18n.language === 'vi' ? 'text-primary' : 'hover:text-white'}
            >
              VN
            </button>
          </div>

          {/* Auth area — skeleton while loading */}
          {loading ? (
            /* Skeleton: invisible to avoid gray box flash */
            <div className="flex items-center gap-2">
              <div className="h-8 w-20" />
              <div className="h-8 w-16" />
            </div>
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2">
              {/* Profile tab — always visible when logged in */}
              <NavTab
                to="/profile"
                icon="account_circle"
                label={t('nav.profile', 'Profile')}
              />

              {/* Top Up tab */}
              <NavTab
                to="/topup"
                icon="account_balance_wallet"
                label={t('nav.topup', 'Top Up')}
              />

              {/* Admin tab — only for admins */}
              {isAdmin && (
                <NavTab
                  to="/admin"
                  icon="admin_panel_settings"
                  label={t('nav.admin', 'Admin')}
                />
              )}

              {/* Logout */}
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="bg-primary/15 hover:bg-primary/25 disabled:opacity-60 disabled:cursor-not-allowed text-primary px-3 py-1.5 rounded-lg font-bold text-xs transition-all border border-primary/40"
              >
                {isSigningOut ? '...' : 'Logout'}
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-primary hover:bg-primary/80 text-white px-5 py-2 rounded-lg font-bold text-sm transition-all neon-border-cyan"
            >
              {t('nav.login')}
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
