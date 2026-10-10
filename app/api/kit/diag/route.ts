import { NextResponse } from "next/server";

export const runtime = "nodejs";

// TEMPORARY diagnostic: runs the real Kit tagging flow and reports each step's
// HTTP status so we can see which "tag a subscriber" endpoint Kit v4 accepts.
// Pass ?email=... (defaults to a throwaway). Exposes no secret. Remove after use.
export async function GET(request: Request) {
  const key = process.env.KIT_API_KEY;
  if (!key) return NextResponse.json({ keyPresent: false });

  const email = new URL(request.url).searchParams.get("email") || "diagtest@example.com";
  const headers = { "Content-Type": "application/json", "X-Kit-Api-Key": key };

  async function call(method: string, path: string, body?: unknown) {
    try {
      const res = await fetch(`https://api.kit.com/v4${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      return { status: res.status, body: text.slice(0, 220) };
    } catch (e) {
      return { error: String(e) };
    }
  }

  const steps: Record<string, unknown> = { email };

  const createSub = await call("POST", "/subscribers", { email_address: email });
  steps.createSubscriber = createSub;
  let subId: number | null = null;
  try {
    subId = JSON.parse((createSub as { body: string }).body).subscriber?.id ?? null;
  } catch {}

  const tagsRes = await call("GET", "/tags");
  let tagId: number | null = null;
  try {
    tagId =
      (JSON.parse((tagsRes as { body: string }).body).tags || []).find(
        (t: { id: number; name: string }) => t.name === "capkitbot-subscriber"
      )?.id ?? null;
  } catch {}
  steps.tagId = tagId;
  steps.subId = subId;

  if (tagId) {
    steps.tagByEmail = await call("POST", `/tags/${tagId}/subscribers`, {
      email_address: email,
    });
  }
  if (tagId && subId) {
    steps.tagById = await call("POST", `/tags/${tagId}/subscribers/${subId}`);
  }

  return NextResponse.json(steps);
}
