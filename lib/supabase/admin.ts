import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client for server-only writes that must bypass Row Level
// Security — specifically the Stripe webhook setting a household's subscription
// status, which no browser client is allowed to do. NEVER import this into a
// client component: the service role key must stay on the server.
export function createAdminSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
