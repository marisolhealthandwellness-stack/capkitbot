import { NextResponse } from "next/server";

export const runtime = "nodejs";

// TEMPORARY diagnostic: checks whether KIT_API_KEY authenticates against Kit's v4
// API, and which auth header it works with. Returns no secret — only the key's
// length and Kit's HTTP status/error. Remove after debugging.
export async function GET() {
  const key = process.env.KIT_API_KEY;
  if (!key) return NextResponse.json({ keyPresent: false });

  async function probe(headers: Record<string, string>) {
    try {
      const res = await fetch("https://api.kit.com/v4/tags", { headers });
      const text = await res.text();
      return { status: res.status, error: res.ok ? null : text.slice(0, 180) };
    } catch (e) {
      return { error: String(e) };
    }
  }

  const apiKeyHeader = await probe({ "X-Kit-Api-Key": key });
  const bearer = await probe({ Authorization: `Bearer ${key}` });

  return NextResponse.json({
    keyPresent: true,
    keyLength: key.length,
    apiKeyHeader,
    bearer,
  });
}
