import { createClient } from '@supabase/supabase-js'

// These should be configured in an .env file when deploying or working locally with a real project.
const envSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const envSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(envSupabaseUrl && envSupabaseAnonKey)

const supabaseUrl = envSupabaseUrl || 'https://mock-example.supabase.co'
const supabaseAnonKey = envSupabaseAnonKey || 'mock-anon-key-abc123'

const isBrowser = typeof window !== 'undefined'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'nobita-auth',
    storage: isBrowser ? window.localStorage : undefined,
  },
})
