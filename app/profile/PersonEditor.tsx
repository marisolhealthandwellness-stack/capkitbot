"use client";

import { useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  calculateProteinTargets,
  mealsWarning,
  validateAgeBand,
  validateGoalForAgeBand,
  type AgeBand,
  type Goal,
} from "@/lib/targets";
import type { Person } from "@/lib/systemPrompt";

const AGE_BAND_OPTIONS: { value: AgeBand; label: string }[] = [
  { value: "6_13", label: "6 to 13" },
  { value: "14_17", label: "14 to 17" },
  { value: "18_plus", label: "18 and up" },
];

const GOAL_OPTIONS: { value: Goal; label: string }[] = [
  { value: "leaner", label: "Leaner" },
  { value: "faster", label: "Faster" },
  { value: "stronger", label: "Stronger" },
  { value: "energy", label: "Energy" },
];

export function PersonEditor({ person }: { person: Person & { id: string } }) {
  const [name, setName] = useState(person.name);
  const [ageBand, setAgeBand] = useState<AgeBand>(person.ageBand);
  const [weightLbs, setWeightLbs] = useState(String(person.weightLbs));
  const [bodyFatPct, setBodyFatPct] = useState(
    person.bodyFatPct != null ? String(person.bodyFatPct) : ""
  );
  const [goal, setGoal] = useState<Goal>(person.goal);
  const [mealsPerDay, setMealsPerDay] = useState(person.mealsPerDay);
  const [avoidNotes, setAvoidNotes] = useState(person.avoidNotes ?? "");
  const [culturalFoods, setCulturalFoods] = useState(person.culturalFoods ?? "");
  const [dietPriority, setDietPriority] = useState(person.dietPriority ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const weightNum = parseFloat(weightLbs) || 0;
  const bodyFatNum = bodyFatPct.trim() === "" ? null : parseFloat(bodyFatPct);

  const preview = useMemo(() => {
    if (weightNum <= 0) return null;
    try {
      return calculateProteinTargets({
        ageBand,
        weightLbs: weightNum,
        bodyFatPct: bodyFatNum,
        goal,
        mealsPerDay,
      });
    } catch {
      return null;
    }
  }, [ageBand, weightNum, bodyFatNum, goal, mealsPerDay]);

  const warning = mealsWarning(goal, mealsPerDay);

  async function handleSave() {
    setError(null);
    try {
      validateAgeBand(ageBand);
      validateGoalForAgeBand(goal, ageBand);
    } catch (err) {
      setError((err as Error).message);
      return;
    }

    if (weightNum <= 0) {
      setError("Weight has to be a positive number.");
      return;
    }

    setSaving(true);
    const targets = calculateProteinTargets({
      ageBand,
      weightLbs: weightNum,
      bodyFatPct: bodyFatNum,
      goal,
      mealsPerDay,
    });

    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase
      .from("people")
      .update({
        name,
        age_band: ageBand,
        weight_lbs: weightNum,
        body_fat_pct: bodyFatNum,
        goal,
        meals_per_day: mealsPerDay,
        avoid_notes: avoidNotes || null,
        cultural_foods: culturalFoods || null,
        diet_priority: dietPriority || null,
        protein_g_day: targets.proteinGDay,
        protein_g_per_meal: targets.proteinGPerMeal,
      })
      .eq("id", person.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSavedAt(Date.now());
  }

  return (
    <div className="rounded-xl border border-plum/10 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-plum">
          {name || "Unnamed"}
          {person.isPrimary && (
            <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-claret">
              meal planner
            </span>
          )}
        </h3>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="col-span-2 flex flex-col gap-1 text-sm text-plum">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-plum/15 px-3 py-2 focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Age band
          <select
            value={ageBand}
            onChange={(e) => setAgeBand(e.target.value as AgeBand)}
            className="rounded-lg border border-plum/15 px-3 py-2 focus:outline-none focus:border-claret"
          >
            {AGE_BAND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Weight (lb)
          <input
            type="number"
            value={weightLbs}
            onChange={(e) => setWeightLbs(e.target.value)}
            className="rounded-lg border border-plum/15 px-3 py-2 focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Body fat % (optional)
          <input
            type="number"
            value={bodyFatPct}
            onChange={(e) => setBodyFatPct(e.target.value)}
            className="rounded-lg border border-plum/15 px-3 py-2 focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Goal
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value as Goal)}
            className="rounded-lg border border-plum/15 px-3 py-2 focus:outline-none focus:border-claret"
          >
            {GOAL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} disabled={o.value === "leaner" && ageBand !== "18_plus"}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-sm text-plum">
          Meals per day
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((n) => (
              <button
                type="button"
                key={n}
                onClick={() => setMealsPerDay(n)}
                className={`rounded-full border px-3 py-1 text-sm ${
                  mealsPerDay === n ? "border-claret bg-claret text-bone" : "border-plum/15 text-plum"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-sm text-plum">
          Avoid
          <textarea
            value={avoidNotes}
            onChange={(e) => setAvoidNotes(e.target.value)}
            rows={2}
            className="rounded-lg border border-plum/15 px-3 py-2 focus:outline-none focus:border-claret"
          />
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-sm text-plum">
          Cultural foods to build around
          <textarea
            value={culturalFoods}
            onChange={(e) => setCulturalFoods(e.target.value)}
            rows={2}
            className="rounded-lg border border-plum/15 px-3 py-2 focus:outline-none focus:border-claret"
          />
        </label>

        <label className="col-span-2 flex flex-col gap-1 text-sm text-plum">
          Stated priority (e.g. plant-based)
          <input
            value={dietPriority}
            onChange={(e) => setDietPriority(e.target.value)}
            className="rounded-lg border border-plum/15 px-3 py-2 focus:outline-none focus:border-claret"
          />
        </label>
      </div>

      {warning && <p className="mt-2 text-xs text-amber-700">{warning}</p>}

      {preview && (
        <p className="mt-2 text-xs text-plum/60">
          Protein target: {preview.proteinGDay}g/day, {preview.proteinGPerMeal}g/meal
          {preview.usedFallback ? " (estimated without body fat)" : ""}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-3 rounded-full bg-spark px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {saving ? "Saving..." : savedAt ? "Saved" : "Save"}
      </button>
    </div>
  );
}
