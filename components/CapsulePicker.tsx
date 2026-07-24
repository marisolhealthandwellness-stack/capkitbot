"use client";

import { useMemo, useState } from "react";
import {
  CAPSULE_CATEGORIES,
  type CapsuleCategory,
  type CapsuleCategoryKey,
} from "@/lib/capsuleOptions";
import type {
  CookSkill,
  HouseholdCapsule,
  PreparedFoodLevel,
  StoreTier,
} from "@/lib/systemPrompt";

// Static class strings per accent so Tailwind's scanner keeps them.
const ACCENT: Record<
  CapsuleCategory["accent"],
  { chipOn: string; label: string }
> = {
  claret: { chipOn: "bg-claret text-bone border-claret", label: "text-claret" },
  slate: { chipOn: "bg-slate text-bone border-slate", label: "text-slate" },
  mint: { chipOn: "bg-mint text-plum border-mint", label: "text-[#33473D]" },
  rose: { chipOn: "bg-rose text-bone border-rose", label: "text-rose" },
  plum: { chipOn: "bg-plum text-bone border-plum", label: "text-plum" },
};

export interface CapsulePickerValue {
  proteins: string[];
  carbs: string[];
  produce: string[];
  spicesSauces: string[];
  fats: string[];
  cuisines: string[];
  recipes: string | null;
  cookSkill: CookSkill;
  preparedFoodLevel: PreparedFoodLevel;
  storeTier: StoreTier;
}

type Selections = Record<CapsuleCategoryKey, string[]>;

function toList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CapsulePicker({
  initial,
  onSave,
  saveLabel = "Save",
}: {
  initial: HouseholdCapsule | null;
  onSave: (value: CapsulePickerValue) => Promise<{ error?: string }>;
  saveLabel?: string;
}) {
  const [selections, setSelections] = useState<Selections>({
    proteins: initial?.proteins ?? [],
    carbs: initial?.carbs ?? [],
    produce: initial?.produce ?? [],
    spicesSauces: initial?.spicesSauces ?? [],
    fats: initial?.fats ?? [],
  });
  const [customInput, setCustomInput] = useState<Record<CapsuleCategoryKey, string>>({
    proteins: "",
    carbs: "",
    produce: "",
    spicesSauces: "",
    fats: "",
  });
  const [cuisines, setCuisines] = useState((initial?.cuisines ?? []).join(", "));
  const [recipes, setRecipes] = useState(initial?.recipes ?? "");
  const [cookSkill, setCookSkill] = useState<CookSkill>(initial?.cookSkill ?? "average");
  const [preparedFoodLevel, setPreparedFoodLevel] = useState<PreparedFoodLevel>(
    initial?.preparedFoodLevel ?? "batch_staples"
  );
  const [storeTier, setStoreTier] = useState<StoreTier>(initial?.storeTier ?? "grocery");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  function toggle(key: CapsuleCategoryKey, item: string, cap: number) {
    setSelections((prev) => {
      const current = prev[key];
      if (current.includes(item)) {
        return { ...prev, [key]: current.filter((x) => x !== item) };
      }
      if (current.length >= cap) return prev; // at cap — must swap
      return { ...prev, [key]: [...current, item] };
    });
  }

  function addCustom(key: CapsuleCategoryKey, cap: number) {
    const raw = customInput[key].trim();
    if (!raw) return;
    setSelections((prev) => {
      const current = prev[key];
      if (current.length >= cap || current.some((x) => x.toLowerCase() === raw.toLowerCase())) {
        return prev;
      }
      return { ...prev, [key]: [...current, raw] };
    });
    setCustomInput((prev) => ({ ...prev, [key]: "" }));
  }

  const totalPicked = useMemo(
    () => Object.values(selections).reduce((n, arr) => n + arr.length, 0),
    [selections]
  );

  async function handleSave() {
    setError(null);
    setSaving(true);
    const result = await onSave({
      proteins: selections.proteins,
      carbs: selections.carbs,
      produce: selections.produce,
      spicesSauces: selections.spicesSauces,
      fats: selections.fats,
      cuisines: toList(cuisines),
      recipes: recipes.trim() || null,
      cookSkill,
      preparedFoodLevel,
      storeTier,
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSavedAt(Date.now());
  }

  return (
    <div className="flex flex-col gap-6">
      {CAPSULE_CATEGORIES.map((cat) => {
        const picked = selections[cat.key];
        const full = picked.length >= cat.cap;
        const accent = ACCENT[cat.accent];
        const customsNotInPresets = picked.filter((x) => !cat.presets.includes(x));
        return (
          <section key={cat.key}>
            <div className="flex items-baseline justify-between">
              <h3 className={`text-xs font-semibold uppercase tracking-[0.14em] ${accent.label}`}>
                {cat.label}
              </h3>
              <span className="text-xs tabular-nums text-plum/50">
                {picked.length}/{cat.cap}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              {cat.presets.map((item) => {
                const on = picked.includes(item);
                const disabled = !on && full;
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggle(cat.key, item, cat.cap)}
                    disabled={disabled}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      on ? accent.chipOn : "border-plum/20 bg-white text-plum"
                    } ${disabled ? "opacity-30" : ""}`}
                  >
                    {item}
                  </button>
                );
              })}

              {customsNotInPresets.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => toggle(cat.key, item, cat.cap)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${accent.chipOn}`}
                >
                  {item} ×
                </button>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                value={customInput[cat.key]}
                onChange={(e) =>
                  setCustomInput((prev) => ({ ...prev, [cat.key]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustom(cat.key, cat.cap);
                  }
                }}
                disabled={full}
                placeholder={full ? "Category full — remove one to add" : "Add your own…"}
                className="flex-1 rounded-lg border border-plum/15 bg-white px-3 py-1.5 text-sm text-plum placeholder:text-plum/40 focus:border-claret focus:outline-none disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => addCustom(cat.key, cat.cap)}
                disabled={full || !customInput[cat.key].trim()}
                className="rounded-lg border border-plum/20 px-3 py-1.5 text-sm text-plum disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </section>
        );
      })}

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-plum/60">
          Kitchen
        </h3>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-plum">
            Cooking skill
            <select
              value={cookSkill}
              onChange={(e) => setCookSkill(e.target.value as CookSkill)}
              className="rounded-lg border border-plum/15 bg-white px-3 py-2 focus:border-claret focus:outline-none"
            >
              <option value="no_cook">No cook</option>
              <option value="newbie">Newbie</option>
              <option value="average">Average</option>
              <option value="chef">Chef</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-plum">
            Prepared food
            <select
              value={preparedFoodLevel}
              onChange={(e) => setPreparedFoodLevel(e.target.value as PreparedFoodLevel)}
              className="rounded-lg border border-plum/15 bg-white px-3 py-2 focus:border-claret focus:outline-none"
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
              className="rounded-lg border border-plum/15 bg-white px-3 py-2 focus:border-claret focus:outline-none"
            >
              <option value="budget">Budget</option>
              <option value="grocery">Grocery</option>
              <option value="specialty">Specialty</option>
            </select>
          </label>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm text-plum">
          Cuisines you lean toward (optional)
          <input
            value={cuisines}
            onChange={(e) => setCuisines(e.target.value)}
            placeholder="Puerto Rican, Mexican…"
            className="rounded-lg border border-plum/15 bg-white px-3 py-2 placeholder:text-plum/40 focus:border-claret focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-plum">
          A recipe to keep in rotation (optional)
          <textarea
            value={recipes}
            onChange={(e) => setRecipes(e.target.value)}
            rows={3}
            placeholder="Paste a recipe and the bot will rework it to your targets…"
            className="rounded-lg border border-plum/15 bg-white px-3 py-2 placeholder:text-plum/40 focus:border-claret focus:outline-none"
          />
        </label>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || totalPicked === 0}
          className="rounded-full bg-spark px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : savedAt ? "Saved" : saveLabel}
        </button>
        {totalPicked === 0 && (
          <span className="text-xs text-plum/50">Pick at least one ingredient.</span>
        )}
      </div>
    </div>
  );
}
