import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getHouseholdForUser, getRecentMessages } from "@/lib/household";
import { ChatClient } from "./ChatClient";

export default async function ChatPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const household = await getHouseholdForUser(supabase, user.id);
  if (!household) {
    redirect("/login");
  }

  // Setup is a form now, not a chat conversation — send unfinished households there.
  if (household.onboarding_state !== "complete") {
    redirect("/setup");
  }

  const history = await getRecentMessages(supabase, household.id, 20);
  const initialMessages = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      content: m.content,
      chips: m.chips,
    }));

  return <ChatClient initialMessages={initialMessages} />;
}
