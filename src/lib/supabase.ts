import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Browser client ────────────────────────────────────────────────────────────
// Uses the anon key. Safe to use in Client Components.
// RLS policies enforce row-level access.
function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// ── Server client (anon) ──────────────────────────────────────────────────────
// Uses the anon key. Use in Server Components for public data
// (e.g. published course catalogue). RLS still applies.
export function createServerClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  })
}

// ── Service role client ───────────────────────────────────────────────────────
// Uses the service role key — BYPASSES RLS entirely.
// Only use in:
//   - API route handlers (webhook endpoints, server actions)
//   - Never import this in Client Components or expose to the browser
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}
