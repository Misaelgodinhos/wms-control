import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && key)

// The entry point checks isSupabaseConfigured before mounting App.
// Missing environment variables therefore produce a setup screen, not a blank page.
export const supabase = (
  isSupabaseConfigured ? createClient(url!, key!) : null
) as ReturnType<typeof createClient>
