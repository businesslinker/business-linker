import { createClient } from '@supabase/supabase-js'

// IMPORTANT: service role key bypasses RLS entirely and has full DB access.
// Only ever import this inside 'use server' files, and always verify the
// caller's own role/permissions from the DB before performing a privileged
// action — the service role itself does not check who is calling it.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  )
}
