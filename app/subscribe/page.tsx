import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getHouseholdForUser } from "@/lib/household";
import { BILLING_ENABLED, getBilling, hasAccess, trialDaysLeft } from "@/lib/billing";
import { SubscribeClient } from "./SubscribeClient";

export default async function SubscribePage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const household = await getHouseholdForUser(supabase, user.id);
  if (!household) redirect("/login");

  // If billing isn't turned on, there's nothing to subscribe to — go to chat.
  if (!BILLING_ENABLED) redirect("/chat");

  const billing = await getBilling(supabase, household.id);

  return (
    <SubscribeClient
      access={hasAccess(billing)}
      subscribed={billing?.status === "active"}
      daysLeft={trialDaysLeft(billing)}
    />
  );
}
