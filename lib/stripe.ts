import Stripe from "stripe";

// Single Stripe client, created lazily so the app still builds and runs when
// STRIPE_SECRET_KEY isn't set yet (billing disabled). apiVersion is left to the
// SDK's pinned default to avoid version-string type drift.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    // Pin an API version that supports Managed Payments (needs 2025-03-31.basil or
    // greater). Cast because this SDK version's types predate the string.
    cached = new Stripe(key, { apiVersion: "2025-03-31.basil" as Stripe.StripeConfig["apiVersion"] });
  }
  return cached;
}
