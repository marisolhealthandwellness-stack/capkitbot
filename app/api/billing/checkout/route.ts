import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getHouseholdForUser } from "@/lib/household";
import { getStripe } from "@/lib/stripe";
import { BILLING_ENABLED } from "@/lib/billing";

export const runtime = "nodejs";

// Starts a Stripe Checkout session for the $25/mo subscription and returns its URL.
// The free trial is handled app-side before this point, so checkout is a plain
// paid subscription — paying here makes the household active immediately.
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

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return NextResponse.json({ error: "STRIPE_PRICE_ID not set" }, { status: 500 });
    }

    const origin =
      request.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "";
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: household.id,
      customer_email: user.email ?? undefined,
      // household_id on the subscription so later subscription.* webhooks can map
      // back to the household.
      subscription_data: { metadata: { household_id: household.id } },
      metadata: { household_id: household.id },
      success_url: `${origin}/chat`,
      cancel_url: `${origin}/subscribe`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[/api/billing/checkout] failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Could not start checkout.", detail }, { status: 500 });
  }
}
