// Minimal Kit (ConvertKit) v4 client for tagging subscribers when they start or
// cancel a CapKitBOT subscription. These tags let Kit drive welcome / win-back
// email flows. Tagging must NEVER break billing, so every call is best-effort and
// swallows its own errors — a Kit outage can't fail a Stripe webhook.

const KIT_API = "https://api.kit.com/v4";

export const KIT_TAG_SUBSCRIBER = "capkitbot-subscriber";
export const KIT_TAG_CANCELED = "capkitbot-canceled";

// Tag ids are stable; cache per server instance to avoid a lookup every call.
const tagIdCache = new Map<string, number>();

async function kitFetch(path: string, init?: RequestInit) {
  const key = process.env.KIT_API_KEY;
  if (!key) throw new Error("KIT_API_KEY not set");
  const res = await fetch(`${KIT_API}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Kit-Api-Key": key,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Kit ${path} -> ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function getOrCreateTagId(name: string): Promise<number> {
  const cached = tagIdCache.get(name);
  if (cached !== undefined) return cached;

  const list = await kitFetch("/tags");
  const existing = (list.tags || []).find(
    (t: { id: number; name: string }) => t.name === name
  );
  if (existing) {
    tagIdCache.set(name, existing.id);
    return existing.id;
  }

  const created = await kitFetch("/tags", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  const id: number = created.tag?.id ?? created.id;
  tagIdCache.set(name, id);
  return id;
}

export async function tagSubscriber(email: string, tagName: string): Promise<void> {
  if (!process.env.KIT_API_KEY) return; // Kit integration not configured yet.
  try {
    const tagId = await getOrCreateTagId(tagName);
    await kitFetch(`/tags/${tagId}/subscribers`, {
      method: "POST",
      body: JSON.stringify({ email_address: email }),
    });
  } catch (err) {
    console.error("[kit] tagSubscriber failed:", err);
  }
}
