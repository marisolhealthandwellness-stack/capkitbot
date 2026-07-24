import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCapsule, getHouseholdForUser, getPeople } from "@/lib/household";
import { SetupClient } from "./SetupClient";
import type { TargetsValue } from "./TargetsStep";

export default async function SetupPage() {
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

  // Already fully set up — nothing to do here.
  if (household.onboarding_state === "complete") {
    redirect("/chat");
  }

  const [people, capsule] = await Promise.all([
    getPeople(supabase, household.id),
    getCapsule(supabase, household.id),
  ]);

  const planner = people.find((p) => p.isPrimary) ?? null;
  const plannerInitial: Partial<TargetsValue> | undefined = planner
    ? {
        name: planner.name,
        weightLbs: planner.weightLbs,
        bodyFatPct: planner.bodyFatPct,
        goal: planner.goal,
        mealsPerDay: planner.mealsPerDay,
        avoidNotes: planner.avoidNotes,
        culturalFoods: planner.culturalFoods,
      }
    : undefined;

  // Resume at the capsule step if the planner is already saved.
  const startStep = planner ? "capsule" : "targets";

  return (
    <SetupClient
      householdId={household.id}
      plannerId={planner?.id ?? null}
      plannerInitial={plannerInitial}
      capsuleInitial={capsule}
      startStep={startStep}
    />
  );
}
