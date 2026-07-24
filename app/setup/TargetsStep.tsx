"use client";

import { useMemo, useState } from "react";
import { GOAL_META } from "@/lib/goals";
import {
  calculateProteinTargets,
  mealsWarning,
  type Goal,
} from "@/lib/targets";

export interface TargetsValue {
  name: string;
  weightLbs: number;
  bodyFatPct: number | null;
  goal: Goal;
  mealsPerDay: number;
  avoidNotes: string | null;
  culturalFoods: string | null;
}

// The quick-setup form assumes an adult planner (18+); kids and teens are added
// later from the Profile screen, where the age band can be set.
export function TargetsStep({
  initial,
  onSave,
  saveLabel = "Save and continue",
}: {
  initial?: Partial<TargetsValue>;
  onSave: (value: TargetsValue) => Promise<{ error?: string }>;
  saveLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [weight, setWeight] = useState(initial?.weightLbs ? String(initial.weightLbs) : "");
  const [bodyFat, setBodyFat] = useState(
    initial?.bodyFatPct != null ? String(initial.bodyFatPct) : ""
  );
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "leaner");
  const [mealsPerDay, setMealsPerDay] = useState(initial?.mealsPerDay ?? 3);
  const [avoid, setAvoid] = useState(initial?.avoidNotes ?? "");
  const [cultural, setCultural] = useState(initial?.culturalFoods ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weightNum = parseFloat(weight) || 0;
  const bodyFatNum = bodyFat.trim() === "" ? null : parseFloat(bodyFat);

  const preview = useMemo(() => {
    if (weightNum <= 0) return null;
    try {
      return calculateProteinTargets({
        ageBand: "18_plus",
        weightLbs: weightNum,
        bodyFatPct: bodyFatNum,
        goal,
        mealsPerDay,
      });
    } catch {
      return null;
    }
  }, [weightNum, bodyFatNum, goal, mealsPerDay]);

  const warning = mealsWarning(goal, mealsPerDay);

  async function handleSubmit() {
    setError(null);
    if (weightNum <= 0) {
      setError("Enter a weight so the bot can set your protein target.");
      return;
    }
    setSaving(true);
    const result = await onSave({
      name: name.trim() || "Me",
      weightLbs: weightNum,
      bodyFatPct: bodyFatNum,
      goal,
      mealsPerDay,
      avoidNotes: avoid.trim() || null,
      culturalFoods: cultural.trim() || null,
    });
    setSaving(false);
    if (result.error) setError(result.error);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl italic text-plum">Let&apos;s set your targets.</h1>
        <p className="mt-1 text-sm text-plum/60">
          Body fat is optional — leave it blank and the bot uses the weight-based fallback.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-plum">
        First name (optional)
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Sam"
          className="rounded-lg border border-plum/15 bg-white px-3 py-2 placeholder:text-plum/40 focus:border-claret focus:outline-none"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-plum">
          Weight (lb)
          <input
            type="number"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="175"
            className="rounded-lg border border-plum/15 bg-white px-3 py-2 placeholder:text-plum/40 focus:border-claret focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-plum">
          Body fat % (optional)
          <input
            type="number"
            inputMode="decimal"
            value={bodyFat}
            onChange={(e) => setBodyFat(e.target.value)}
            placeholder="—"
            className="rounded-lg border border-plum/15 bg-white px-3 py-2 placeholder:text-plum/40 focus:border-claret focus:outline-none"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-plum">Goal</span>
        <div className="flex flex-col gap-2">
          {GOAL_META.map((g) => {
            const on = goal === g.value;
            return (
              <button
                type="button"
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                  on ? "border-claret bg-claret text-bone" : "border-plum/15 bg-white text-plum"
                }`}
              >
                <span className="block text-sm font-semibold">{g.label}</span>
                <span className={`block text-xs ${on ? "text-bone/80" : "text-plum/55"}`}>
                  {g.blurb}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm text-plum">Meals per day</span>
        <div className="flex gap-2">
          {[2, 3, 4, 5].map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => setMealsPerDay(n)}
              className={`h-11 flex-1 rounded-lg border text-sm ${
                mealsPerDay === n ? "border-claret bg-claret text-bone" : "border-plum/15 bg-white text-plum"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {warning && <p className="text-xs text-amber-700">{warning}</p>}
      </div>

      <label className="flex flex-col gap-1 text-sm text-plum">
        Foods to avoid / triggers (optional)
        <input
          value={avoid}
          onChange={(e) => setAvoid(e.target.value)}
          placeholder="dairy, shellfish…"
          className="rounded-lg border border-plum/15 bg-white px-3 py-2 placeholder:text-plum/40 focus:border-claret focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-plum">
        Cultural / favorite foods (optional)
        <input
          value={cultural}
          onChange={(e) => setCultural(e.target.value)}
          placeholder="Puerto Rican, Mexican…"
          className="rounded-lg border border-plum/15 bg-white px-3 py-2 placeholder:text-plum/40 focus:border-claret focus:outline-none"
        />
      </label>

      {preview && (
        <p className="text-xs text-plum/60">
          Protein target: {preview.proteinGDay}g/day, {preview.proteinGPerMeal}g/meal
          {preview.usedFallback ? " (estimated without body fat)" : ""}.
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="rounded-full bg-spark px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}
