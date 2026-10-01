import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { KIT_TAG_CANCELED, KIT_TAG_SUBSCRIBER, tagSubscriber } from "@/lib/kit";

export const runtime = "nodejs";

// Stripe's signed webhook is the ONLY writer of subscription status (via the
// service-role client, which bypasses RLS). We verify the signature so forged
// "they paid" calls are rejected.
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig || "", secret);
  } catch (err) {
    console.error("[stripe webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleEvent(event);
  } catch (err) {
    console.error("[stripe webhook] handler failed:", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function setBilling(householdId: string, fields: Record<string, unknown>) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("household_billing")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("household_id", householdId);
  if (error) throw error;
}

const STATUS_MAP: Record<string, string> = {
  active: "active",
  trialing: "active",
  past_due: "past_due",
  unpaid: "past_due",
  incomplete: "past_due",
  canceled: "canceled",
  incomplete_expired: "canceled",
};

async function handleEvent(event: Stripe.Event) {
  const stripe = getStripe();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const householdId = session.client_reference_id || session.metadata?.household_id;
      if (!householdId) return;

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

      await setBilling(householdId, {
        status: "active",
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        current_period_end: periodEnd,
      });

      const email = session.customer_details?.email;
      if (email) await tagSubscriber(email, KIT_TAG_SUBSCRIBER);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const householdId = sub.metadata?.household_id;
      if (!householdId) return;
      await setBilling(householdId, {
        status: STATUS_MAP[sub.status] ?? "past_due",
        stripe_subscription_id: sub.id,
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const householdId = sub.metadata?.household_id;
      if (!householdId) return;
      await setBilling(householdId, { status: "canceled" });

      const email = await emailForCustomer(stripe, sub.customer);
      if (email) await tagSubscriber(email, KIT_TAG_CANCELED);
      break;
    }

    default:
      break;
  }
}

async function emailForCustomer(
  stripe: Stripe,
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null
): Promise<string | null> {
  try {
    const id = typeof customer === "string" ? customer : customer?.id;
    if (!id) return null;
    const c = await stripe.customers.retrieve(id);
    if ((c as Stripe.DeletedCustomer).deleted) return null;
    return (c as Stripe.Customer).email ?? null;
  } catch {
    return null;
  }
}
