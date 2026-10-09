import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getHouseholdForUser } from "@/lib/household";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { KIT_TAG_SUBSCRIBER, tagSubscriber } from "@/lib/kit";
import { BILLING_ENABLED } from "@/lib/billing";

export const runtime = "nodejs";

// Stripe Checkout returns the member here after paying. We verify the session with
// Stripe and set the household active immediately — so access is granted on the
// spot instead of racing the async webhook. The webhook still handles everything
// after this point (renewals, cancellations, payment failures).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const sessionId = url.searchParams.get("session_id");

  const toChat = NextResponse.redirect(`${base}/chat`);
  const toSubscribe = NextResponse.redirect(`${base}/subscribe`);

  if (!BILLING_ENABLED || !sessionId) return toChat;

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(`${base}/login`);

    const household = await getHouseholdForUser(supabase, user.id);
    if (!household) return toSubscribe;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Only trust a paid session that actually belongs to this household.
    const belongs =
      session.client_reference_id === household.id ||
      session.metadata?.household_id === household.id;
    const paid = session.payment_status === "paid" || session.status === "complete";
    if (!belongs || !paid) return toSubscribe;

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;
    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;

    let periodEnd: string | null = null;
    if (subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;
    }

    const admin = createAdminSupabaseClient();
    await admin
      .from("household_billing")
      .update({
        status: "active",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        current_period_end: periodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq("household_id", household.id);

    const email = session.customer_details?.email || user.email;
    if (email) await tagSubscriber(email, KIT_TAG_SUBSCRIBER);

    return toChat;
  } catch (err) {
    console.error("[/api/billing/confirm] failed:", err);
    return toSubscribe;
  }
}
