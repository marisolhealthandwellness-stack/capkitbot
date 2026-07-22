import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCapsule, getHouseholdForUser, getPeople } from "@/lib/household";
import { ProfileClient } from "./ProfileClient";

export default async function ProfilePage() {
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

  const [people, capsule] = await Promise.all([
    getPeople(supabase, household.id),
    getCapsule(supabase, household.id),
  ]);

  return (
    <ProfileClient householdId={household.id} initialPeople={people} initialCapsule={capsule} />
  );
}
