import Stripe from "stripe";

// Single Stripe client, created lazily so the app still builds and runs when
// STRIPE_SECRET_KEY isn't set yet (billing disabled). apiVersion is left to the
// SDK's pinned default to avoid version-string type drift.
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    cached = new Stripe(key);
  }
  return cached;
}
