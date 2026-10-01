import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getHouseholdForUser } from "@/lib/household";
import { getStripe } from "@/lib/stripe";
import { BILLING_ENABLED, getBilling } from "@/lib/billing";

export const runtime = "nodejs";

// Opens the Stripe Customer Portal so a subscriber can update their card, see
// invoices, or cancel — Stripe hosts that screen, we just hand them a session URL.
export async function POST(request: Request) {
  try {
    if (!BILLING_ENABLED) {
      return NextResponse.json({ error: "Billing is not enabled." }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const household = await getHouseholdForUser(supabase, user.id);
    if (!household) return NextResponse.json({ error: "No household found" }, { status: 404 });

    const billing = await getBilling(supabase, household.id);
    if (!billing?.stripe_customer_id) {
      return NextResponse.json({ error: "No billing account yet." }, { status: 400 });
    }

    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${origin}/subscribe`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[/api/billing/portal] failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Could not open billing.", detail }, { status: 500 });
  }
}
