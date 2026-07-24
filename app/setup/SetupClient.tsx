"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { calculateProteinTargets } from "@/lib/targets";
import type { HouseholdCapsule } from "@/lib/systemPrompt";
import { CapsulePicker, type CapsulePickerValue } from "@/components/CapsulePicker";
import { TargetsStep, type TargetsValue } from "./TargetsStep";

type Step = "targets" | "capsule";

export function SetupClient({
  householdId,
  plannerId,
  plannerInitial,
  capsuleInitial,
  startStep,
}: {
  householdId: string;
  plannerId: string | null;
  plannerInitial?: Partial<TargetsValue>;
  capsuleInitial: HouseholdCapsule | null;
  startStep: Step;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(startStep);
  const [savedPlannerId, setSavedPlannerId] = useState<string | null>(plannerId);

  async function saveTargets(v: TargetsValue): Promise<{ error?: string }> {
    const supabase = createBrowserSupabaseClient();
    const targets = calculateProteinTargets({
      ageBand: "18_plus",
      weightLbs: v.weightLbs,
      bodyFatPct: v.bodyFatPct,
      goal: v.goal,
      mealsPerDay: v.mealsPerDay,
    });

    const row = {
      household_id: householdId,
      name: v.name,
      is_primary: true,
      age_band: "18_plus" as const,
      weight_lbs: v.weightLbs,
      body_fat_pct: v.bodyFatPct,
      goal: v.goal,
      meals_per_day: v.mealsPerDay,
      avoid_notes: v.avoidNotes,
      cultural_foods: v.culturalFoods,
      protein_g_day: targets.proteinGDay,
      protein_g_per_meal: targets.proteinGPerMeal,
    };

    if (savedPlannerId) {
      const { error } = await supabase.from("people").update(row).eq("id", savedPlannerId);
      if (error) return { error: error.message };
    } else {
      const { data, error } = await supabase
        .from("people")
        .insert(row)
        .select("id")
        .single();
      if (error) return { error: error.message };
      setSavedPlannerId(data.id as string);
    }

    setStep("capsule");
    return {};
  }

  async function saveCapsule(v: CapsulePickerValue): Promise<{ error?: string }> {
    const supabase = createBrowserSupabaseClient();
    const { error: capsuleError } = await supabase.from("household_capsule").upsert({
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
    if (capsuleError) return { error: capsuleError.message };

    const { error: stateError } = await supabase
      .from("households")
      .update({ onboarding_state: "complete" })
      .eq("id", householdId);
    if (stateError) return { error: stateError.message };

    router.push("/chat");
    router.refresh();
    return {};
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col bg-bone px-5 py-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex items-baseline gap-0.5 font-semibold text-plum">
          CapKitBOT<span className="text-lg leading-none text-spark">&middot;</span>
        </span>
        <span className="text-xs uppercase tracking-[0.14em] text-plum/50">
          {step === "targets" ? "Step 1 of 2 · targets" : "Step 2 of 2 · your capsule"}
        </span>
      </div>

      {step === "targets" ? (
        <TargetsStep initial={plannerInitial} onSave={saveTargets} />
      ) : (
        <div className="flex flex-col gap-5">
          <div>
            <h1 className="font-display text-2xl italic text-plum">Build your capsule.</h1>
            <p className="mt-1 text-sm text-plum/60">
              Keep it small — a few per group. The bot makes variety by cooking the same
              ingredients different ways, so you don&apos;t need a big list.
            </p>
          </div>
          <CapsulePicker
            initial={capsuleInitial}
            onSave={saveCapsule}
            saveLabel="Finish setup"
          />
        </div>
      )}
    </main>
  );
}
