import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getTellMeSupabaseUrl(): string {
  return process.env.SUPABASE_URL || ''
}

export function getTellMeSupabaseAnonKey(): string {
  return process.env.SUPABASE_ANON_KEY || ''
}

export function hasTellMeSupabaseConfig(): boolean {
  return Boolean(getTellMeSupabaseUrl() && getTellMeSupabaseAnonKey())
}

export function getTellMeClient(): SupabaseClient {
  if (client) {
    return client
  }

  const url = getTellMeSupabaseUrl()
  const anonKey = getTellMeSupabaseAnonKey()

  if (!url || !anonKey) {
    throw new Error('TellMe Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.')
  }

  client = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
    db: {
      schema: 'chatbox_k12',
    },
  })

  return client
}
