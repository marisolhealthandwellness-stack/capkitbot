import { createClient } from "@supabase/supabase-js";

// Daily keep-alive: makes one tiny Supabase query so the free-tier project never
// hits 7 days of inactivity and auto-pauses. This is a stopgap for the pre-paying
// phase — once there are paying customers, upgrade Supabase to Pro (which never
// pauses and adds backups) and this function becomes unnecessary.
export default async () => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.error("[keepalive] missing Supabase env vars");
      return new Response("missing env", { status: 500 });
    }

    const supabase = createClient(url, key, { auth: { persistSession: false } });
    // A HEAD count is the lightest possible request; it still counts as activity.
    const { error } = await supabase
      .from("households")
      .select("id", { head: true, count: "exact" });

    if (error) {
      console.error("[keepalive] query failed:", error.message);
      return new Response("query failed", { status: 500 });
    }

    console.log("[keepalive] ok");
    return new Response("ok");
  } catch (e) {
    console.error("[keepalive] error:", e);
    return new Response("error", { status: 500 });
  }
};

// Run once a day (UTC). Netlify's scheduled-function cron.
export const config = { schedule: "@daily" };
