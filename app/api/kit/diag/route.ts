import { NextResponse } from "next/server";

export const runtime = "nodejs";

// TEMPORARY diagnostic: runs the real Kit tagging flow and reports each step so we
// can see which tag-apply endpoint Kit v4 accepts. Parses full responses (only
// truncates for display). Exposes no secret. Remove after use.
export async function GET(request: Request) {
  const key = process.env.KIT_API_KEY;
  if (!key) return NextResponse.json({ keyPresent: false });

  const email = new URL(request.url).searchParams.get("email") || "diagtest@example.com";
  const headers = { "Content-Type": "application/json", "X-Kit-Api-Key": key };

  async function call(method: string, path: string, body?: unknown) {
    const res = await fetch(`https://api.kit.com/v4${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, text: await res.text() };
  }

  const steps: Record<string, unknown> = { email };

  const createSub = await call("POST", "/subscribers", { email_address: email });
  steps.createSubscriber = { status: createSub.status };
  let subId: number | null = null;
  try {
    subId = JSON.parse(createSub.text).subscriber?.id ?? null;
  } catch {}
  steps.subId = subId;

  const tagsRes = await call("GET", "/tags?per_page=100");
  let tags: { id: number; name: string }[] = [];
  try {
    tags = JSON.parse(tagsRes.text).tags || [];
  } catch {}
  const tag = tags.find((t) => t.name === "capkitbot-subscriber");
  steps.tagsStatus = tagsRes.status;
  steps.tagCount = tags.length;
  steps.tagId = tag?.id ?? null;

  if (tag?.id) {
    const byEmail = await call("POST", `/tags/${tag.id}/subscribers`, {
      email_address: email,
    });
    steps.tagByEmail = { status: byEmail.status, body: byEmail.text.slice(0, 160) };
    if (subId) {
      const byId = await call("POST", `/tags/${tag.id}/subscribers/${subId}`);
      steps.tagById = { status: byId.status, body: byId.text.slice(0, 160) };
    }
  }

  return NextResponse.json(steps);
}
