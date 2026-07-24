"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { calculateProteinTargets } from "@/lib/targets";
import type { HouseholdCapsule, Person } from "@/lib/systemPrompt";
import { CapsulePicker, type CapsulePickerValue } from "@/components/CapsulePicker";
import { PersonEditor } from "./PersonEditor";

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
  const [addError, setAddError] = useState<string | null>(null);

  async function handleAddPerson() {
    setAddError(null);
    setAdding(true);
    const targets = calculateProteinTargets({
      ageBand: "18_plus",
      weightLbs: 150,
      bodyFatPct: null,
      goal: "faster",
      mealsPerDay: 3,
    });

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("people").insert({
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

    if (error) {
      setAddError(error.message);
      return;
    }

    router.refresh();
  }

  async function saveCapsule(v: CapsulePickerValue): Promise<{ error?: string }> {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from("household_capsule").upsert({
      household_id: householdId,
      proteins: v.proteins,
      carbs: v.carbs,
      produce: v.produce,
      spices_sauces: v.spicesSauces,
      fats: v.fats,
      cuisines: v.cuisines,
      recipes: v.recipes,
      cook_skill: v.cookSkill,
      prepared_food_level: v.preparedFoodLevel,
      store_tier: v.storeTier,
    });
    if (error) return { error: error.message };
    router.refresh();
    return {};
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col bg-bone px-4 py-6 text-plum">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl italic text-plum">Household profile</h1>
        <Link href="/chat" className="text-sm text-claret underline">
          Back to chat
        </Link>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {initialPeople.map((person) => (
          <PersonEditor key={person.id} person={person} />
        ))}
      </div>

      {addError && <p className="mt-3 text-sm text-red-600">{addError}</p>}

      <button
        onClick={handleAddPerson}
        disabled={adding}
        className="mt-4 self-start rounded-full border border-claret px-4 py-1.5 text-sm text-claret disabled:opacity-40"
      >
        {adding ? "Adding…" : "+ Add person"}
      </button>

      <div className="mt-8 rounded-xl border border-plum/10 bg-white p-4">
        <h2 className="font-medium text-plum">Your capsule</h2>
        <p className="mt-1 text-xs text-plum/50">
          A small, repeated set of ingredients — the bot cooks these different ways.
        </p>
        <div className="mt-4">
          <CapsulePicker initial={initialCapsule} onSave={saveCapsule} saveLabel="Save capsule" />
        </div>
      </div>
    </main>
  );
}
