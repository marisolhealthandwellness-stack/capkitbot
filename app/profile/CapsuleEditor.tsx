"use client";

import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { CookSkill, HouseholdCapsule, PreparedFoodLevel, StoreTier } from "@/lib/systemPrompt";

function toList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const EMPTY_CAPSULE: HouseholdCapsule = {
  proteins: [],
  carbs: [],
  produce: [],
  spicesSauces: [],
  fats: [],
  cuisines: [],
  recipes: null,
  cookSkill: "average",
  preparedFoodLevel: "batch_staples",
  storeTier: "grocery",
};

export function CapsuleEditor({
  householdId,
  initialCapsule,
}: {
  householdId: string;
  initialCapsule: HouseholdCapsule | null;
}) {
  const base = initialCapsule ?? EMPTY_CAPSULE;
  const [proteins, setProteins] = useState(base.proteins.join(", "));
  const [carbs, setCarbs] = useState(base.carbs.join(", "));
  const [produce, setProduce] = useState(base.produce.join(", "));
  const [spicesSauces, setSpicesSauces] = useState(base.spicesSauces.join(", "));
  const [fats, setFats] = useState(base.fats.join(", "));
  const [cuisines, setCuisines] = useState(base.cuisines.join(", "));
  const [recipes, setRecipes] = useState(base.recipes ?? "");
  const [cookSkill, setCookSkill] = useState<CookSkill>(base.cookSkill);
  const [preparedFoodLevel, setPreparedFoodLevel] = useState<PreparedFoodLevel>(
    base.preparedFoodLevel
  );
  const [storeTier, setStoreTier] = useState<StoreTier>(base.storeTier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);

    const supabase = createBrowserSupabaseClient();
    const { error: upsertError } = await supabase.from("household_capsule").upsert({
      household_id: householdId,
      proteins: toList(proteins),
      carbs: toList(carbs),
      produce: toList(produce),
      spices_sauces: toList(spicesSauces),
      fats: toList(fats),
      cuisines: toList(cuisines),
      recipes: recipes || null,
      cook_skill: cookSkill,
      prepared_food_level: preparedFoodLevel,
      store_tier: storeTier,
    });

    setSaving(false);

    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    setSavedAt(Date.now());
  }

  return (
    <div className="rounded-xl border border-plum/10 bg-white p-4">
      <h3 className="font-medium text-plum">Capsule</h3>
      <p className="mt-1 text-xs text-plum/50">Separate items with commas.</p>

      <div className="mt-3 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-plum">
          Proteins
          <textarea
            value={proteins}
            onChange={(e) => setProteins(e.target.value)}
            rows={2}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Carbs and bases
          <textarea
            value={carbs}
            onChange={(e) => setCarbs(e.target.value)}
            rows={2}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Produce
          <textarea
            value={produce}
            onChange={(e) => setProduce(e.target.value)}
            rows={2}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Spices and sauces
          <textarea
            value={spicesSauces}
            onChange={(e) => setSpicesSauces(e.target.value)}
            rows={2}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Fats
          <textarea
            value={fats}
            onChange={(e) => setFats(e.target.value)}
            rows={2}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Cuisines (optional soft steer)
          <input
            value={cuisines}
            onChange={(e) => setCuisines(e.target.value)}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Pasted recipes (optional)
          <textarea
            value={recipes}
            onChange={(e) => setRecipes(e.target.value)}
            rows={3}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>
      </div>

      <h3 className="mt-5 font-medium text-plum">Kitchen context</h3>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-plum">
          Cooking skill
          <select
            value={cookSkill}
            onChange={(e) => setCookSkill(e.target.value as CookSkill)}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          >
            <option value="no_cook">No cook</option>
            <option value="newbie">Newbie</option>
            <option value="average">Average</option>
            <option value="chef">Chef</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Prepared food reliance
          <select
            value={preparedFoodLevel}
            onChange={(e) => setPreparedFoodLevel(e.target.value as PreparedFoodLevel)}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          >
            <option value="from_scratch">From scratch</option>
            <option value="batch_staples">Batch staples</option>
            <option value="grab_and_go">Grab &amp; go</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-plum">
          Grocery access
          <select
            value={storeTier}
            onChange={(e) => setStoreTier(e.target.value as StoreTier)}
            className="rounded-lg border border-plum/15 px-3 py-2 text-plum focus:outline-none focus:border-claret"
          >
            <option value="budget">Budget</option>
            <option value="grocery">Grocery</option>
            <option value="specialty">Specialty</option>
          </select>
        </label>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-full bg-spark px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {saving ? "Saving..." : savedAt ? "Saved" : "Save"}
      </button>
    </div>
  );
}
