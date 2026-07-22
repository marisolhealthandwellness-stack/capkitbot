"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { calculateProteinTargets } from "@/lib/targets";
import type { HouseholdCapsule, Person } from "@/lib/systemPrompt";
import { PersonEditor } from "./PersonEditor";
import { CapsuleEditor } from "./CapsuleEditor";

export function ProfileClient({
  householdId,
  initialPeople,
  initialCapsule,
}: {
  householdId: string;
  initialPeople: (Person & { id: string })[];
  initialCapsule: HouseholdCapsule | null;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  async function handleAddPerson() {
    setAdding(true);
    const targets = calculateProteinTargets({
      ageBand: "18_plus",
      weightLbs: 150,
      bodyFatPct: null,
      goal: "faster",
      mealsPerDay: 3,
    });

    const supabase = createBrowserSupabaseClient();
    await supabase.from("people").insert({
      household_id: householdId,
      name: "New person",
      is_primary: false,
      age_band: "18_plus",
      weight_lbs: 150,
      body_fat_pct: null,
      goal: "faster",
      meals_per_day: 3,
      protein_g_day: targets.proteinGDay,
      protein_g_per_meal: targets.proteinGPerMeal,
    });

    setAdding(false);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Household profile</h1>
        <Link href="/chat" className="text-sm text-bubbleUser underline">
          Back to chat
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {initialPeople.map((person) => (
          <PersonEditor key={person.id} person={person} />
        ))}
      </div>

      <button
        onClick={handleAddPerson}
        disabled={adding}
        className="mt-4 self-start rounded-full border border-bubbleUser px-4 py-1.5 text-sm text-bubbleUser disabled:opacity-40"
      >
        {adding ? "Adding..." : "+ Add person"}
      </button>

      <div className="mt-8">
        <CapsuleEditor householdId={householdId} initialCapsule={initialCapsule} />
      </div>
    </main>
  );
}
