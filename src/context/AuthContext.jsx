import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase, hasSupabaseConfig } from '../lib/supabase'

const AuthContext = createContext(null)
const AUTH_STORAGE_KEY = 'nobita-auth'

function normalizeRole(role) {
  const normalized = String(role ?? '').trim().toLowerCase()
  return normalized || 'user'
}

function getMetadataRole(sessionUser) {
  const appRole = sessionUser?.app_metadata?.role
  if (appRole) return normalizeRole(appRole)

  const userRole = sessionUser?.user_metadata?.role
  if (userRole) return normalizeRole(userRole)

  if (Array.isArray(sessionUser?.app_metadata?.roles)) {
    const matchedRole = sessionUser.app_metadata.roles.find((r) => normalizeRole(r) === 'admin')
    if (matchedRole) return 'admin'
  }

  return 'user'
}

function hasAdminFlag(sessionUser) {
  return Boolean(
    sessionUser?.app_metadata?.is_admin ||
    sessionUser?.user_metadata?.is_admin
  )
}

function toSafeProfile(sessionUser, dbProfile) {
  if (!sessionUser) return null

  const fallbackRole = getMetadataRole(sessionUser)
  const role = normalizeRole(dbProfile?.role || fallbackRole)

  return {
    id: sessionUser.id,
    email: dbProfile?.email || sessionUser.email || null,
    full_name: dbProfile?.full_name || sessionUser?.user_metadata?.full_name || null,
    role,
    balance: dbProfile?.balance ?? 0,
    is_active: dbProfile?.is_active ?? true,
    created_at: dbProfile?.created_at || sessionUser.created_at || null,
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const applySessionRequestRef = useRef(0)

  const fetchProfile = useCallback(async (userId, sessionUser = null) => {
    if (!userId) return null
    if (!hasSupabaseConfig) return toSafeProfile(sessionUser, null)

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, balance, is_active, created_at')
        .eq('id', userId)
        .maybeSingle()

      if (error) throw error
      return toSafeProfile(sessionUser, data)
    } catch (err) {
      console.error('[AuthContext] fetchProfile error:', err)
      return toSafeProfile(sessionUser, null)
    }
  }, [])

  const applySession = useCallback(async (nextSession, options = {}) => {
    const { waitForProfile = false } = options
    const requestId = ++applySessionRequestRef.current
    setSession(nextSession)

    if (!nextSession?.user?.id) {
      setProfile(null)
      return null
    }

    const fallbackProfile = toSafeProfile(nextSession.user, null)
    if (requestId === applySessionRequestRef.current) {
      setProfile(fallbackProfile)
    }

    const syncDbProfile = async () => {
      const nextProfile = await fetchProfile(nextSession.user.id, nextSession.user)
      if (requestId === applySessionRequestRef.current) {
        setProfile(nextProfile)
      }
      return nextProfile
    }

    if (waitForProfile) {
      return syncDbProfile()
    }

    syncDbProfile().catch((err) => {
      console.error('[AuthContext] applySession profile sync error:', err)
    })

    return fallbackProfile
  }, [fetchProfile])

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) {
      setProfile(null)
      return null
    }

    const nextProfile = await fetchProfile(userId, session.user)
    setProfile(nextProfile)
    return nextProfile
  }, [fetchProfile, session])

  useEffect(() => {
    let mounted = true

    if (!hasSupabaseConfig) {
      applySessionRequestRef.current += 1
      setSession(null)
      setProfile(null)
      setLoading(false)
      return undefined
    }

    const hydrateSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession()

        if (!mounted) return
        if (error) throw error

        await applySession(currentSession, { waitForProfile: false })
      } catch (err) {
        console.error('[AuthContext] hydrate session error:', err)
        if (mounted) {
          applySessionRequestRef.current += 1
          setSession(null)
          setProfile(null)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    hydrateSession()

    const authListener = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return
      await applySession(nextSession, { waitForProfile: false })
      if (!mounted) return
      setLoading(false)
    })

    const subscription = authListener?.data?.subscription || authListener?.subscription

    return () => {
      mounted = false
      if (subscription) {
        if (typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe()
        } else if (typeof subscription === 'function') {
          subscription() // Handle older versions or non-standard returns
        }
      }
    }
  }, [applySession])

  const signInWithPassword = useCallback(async ({ email, password }) => {
    if (!hasSupabaseConfig) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
    }

    const normalizedEmail = String(email || '').trim().toLowerCase()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (error) throw error

    const nextProfile = await applySession(data?.session ?? null, { waitForProfile: true })
    return { session: data?.session ?? null, profile: nextProfile }
  }, [applySession])

  const signUpWithPassword = useCallback(async ({ email, password, fullName }) => {
    if (!hasSupabaseConfig) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
    }

    const normalizedEmail = String(email || '').trim().toLowerCase()
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { full_name: String(fullName || '').trim() },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) throw error
    return data
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!hasSupabaseConfig) {
      throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.')
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : (import.meta.env.VITE_SITE_URL || '')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/`,
        queryParams: { prompt: 'select_account' },
      },
    })

    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    applySessionRequestRef.current += 1
    setSession(null)
    setProfile(null)

    if (!hasSupabaseConfig) {
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('[AuthContext] signOut error:', error)
    }

    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(AUTH_STORAGE_KEY)
      } catch (storageErr) {
        console.error('[AuthContext] localStorage clear error:', storageErr)
      }
    }
  }, [])

  const resolvedRole = normalizeRole(profile?.role || getMetadataRole(session?.user))
  const resolvedIsAdmin = resolvedRole === 'admin' || hasAdminFlag(session?.user)

  const getPostLoginPath = useCallback((nextProfile = profile, nextSession = session) => {
    const nextRole = normalizeRole(nextProfile?.role || getMetadataRole(nextSession?.user))
    const nextIsAdmin = nextRole === 'admin' || hasAdminFlag(nextSession?.user)
    return nextIsAdmin ? '/admin' : '/profile'
  }, [profile, session])

  const value = {
    session,
    profile,
    loading,
    isLoggedIn: Boolean(session?.user),
    isAdmin: resolvedIsAdmin,
    role: resolvedRole,
    hasAuthConfig: hasSupabaseConfig,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signOut,
    refreshProfile,
    getPostLoginPath,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
