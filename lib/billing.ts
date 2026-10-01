import type { SupabaseClient } from "@supabase/supabase-js";

// Master switch. Billing/access-gating is OFF until this is set to "true" in the
// environment. That lets the billing code ship and deploy without locking anyone
// out — the gate only turns on once the DB migration, Stripe, and Kit are set up.
export const BILLING_ENABLED = process.env.BILLING_ENABLED === "true";

export interface BillingRow {
  household_id: string;
  status: string;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

export async function getBilling(
  supabase: SupabaseClient,
  householdId: string
): Promise<BillingRow | null> {
  const { data, error } = await supabase
    .from("household_billing")
    .select("*")
    .eq("household_id", householdId)
    .maybeSingle();
  if (error) throw error;
  return data as BillingRow | null;
}

// Access = currently paid, or still inside the free-trial window.
export function hasAccess(billing: BillingRow | null): boolean {
  if (!billing) return false;
  if (billing.status === "active") return true;
  if (
    billing.status === "trialing" &&
    billing.trial_ends_at &&
    new Date(billing.trial_ends_at).getTime() > Date.now()
  ) {
    return true;
  }
  return false;
}

export function trialDaysLeft(billing: BillingRow | null): number {
  if (!billing?.trial_ends_at) return 0;
  const ms = new Date(billing.trial_ends_at).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
