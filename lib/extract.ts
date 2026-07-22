import type { SupabaseClient } from "@supabase/supabase-js";
import type Anthropic from "@anthropic-ai/sdk";
import {
  calculateProteinTargets,
  validateAgeBand,
  validateGoalForAgeBand,
  type AgeBand,
  type Goal,
} from "./targets";

export const ONBOARDING_TOOLS: Anthropic.Tool[] = [
  {
    name: "save_planner_profile",
    description:
      "Save the meal planner's profile once you have their age band, weight, goal, and meals per day. Computes their protein targets.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The planner's first name" },
        age_band: { type: "string", enum: ["6_13", "14_17", "18_plus"] },
        weight_lbs: { type: "number" },
        body_fat_pct: {
          type: "number",
          description: "0-100, omit entirely if they skipped it",
        },
        goal: { type: "string", enum: ["leaner", "faster", "stronger", "energy"] },
        meals_per_day: { type: "integer", minimum: 2, maximum: 5 },
        avoid_notes: { type: "string", description: "Foods/ingredients to avoid, omit if none" },
        cultural_foods: { type: "string", description: "Cultural foods to build around, omit if none" },
        diet_priority: { type: "string", description: "Stated priority like plant-based, omit if none" },
      },
      required: ["name", "age_band", "weight_lbs", "goal", "meals_per_day"],
    },
  },
  {
    name: "add_household_member",
    description: "Save an additional household member (not the planner) with the same profile fields.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        age_band: { type: "string", enum: ["6_13", "14_17", "18_plus"] },
        weight_lbs: { type: "number" },
        body_fat_pct: { type: "number" },
        goal: { type: "string", enum: ["leaner", "faster", "stronger", "energy"] },
        meals_per_day: { type: "integer", minimum: 2, maximum: 5 },
        avoid_notes: { type: "string" },
        cultural_foods: { type: "string" },
        diet_priority: { type: "string" },
      },
      required: ["name", "age_band", "weight_lbs", "goal", "meals_per_day"],
    },
  },
  {
    name: "save_capsule",
    description: "Save the household's food capsule once proteins, carbs, produce, spices/sauces, and fats are known.",
    input_schema: {
      type: "object",
      properties: {
        proteins: { type: "array", items: { type: "string" } },
        carbs: { type: "array", items: { type: "string" } },
        produce: { type: "array", items: { type: "string" } },
        spices_sauces: { type: "array", items: { type: "string" } },
        fats: { type: "array", items: { type: "string" } },
        cuisines: { type: "array", items: { type: "string" }, description: "Optional soft steer" },
        recipes: { type: "string", description: "Pasted recipes, omit if none" },
      },
      required: ["proteins", "carbs", "produce", "spices_sauces", "fats"],
    },
  },
  {
    name: "save_kitchen_context",
    description: "Save cooking skill, prepared-food reliance, and grocery access tier.",
    input_schema: {
      type: "object",
      properties: {
        cook_skill: { type: "string", enum: ["no_cook", "newbie", "average", "chef"] },
        prepared_food_level: { type: "string", enum: ["from_scratch", "batch_staples", "grab_and_go"] },
        store_tier: { type: "string", enum: ["budget", "grocery", "specialty"] },
      },
      required: ["cook_skill", "prepared_food_level", "store_tier"],
    },
  },
];

interface ToolResult {
  content: string;
  isError?: boolean;
}

interface PersonToolInput {
  name: string;
  age_band: AgeBand;
  weight_lbs: number;
  body_fat_pct?: number;
  goal: Goal;
  meals_per_day: number;
  avoid_notes?: string;
  cultural_foods?: string;
  diet_priority?: string;
}

async function savePerson(
  supabase: SupabaseClient,
  householdId: string,
  input: PersonToolInput,
  isPrimary: boolean
): Promise<ToolResult> {
  try {
    validateAgeBand(input.age_band);
    validateGoalForAgeBand(input.goal, input.age_band);
  } catch (err) {
    return { content: (err as Error).message, isError: true };
  }

  if (isPrimary) {
    const { data: existingPrimary } = await supabase
      .from("people")
      .select("id")
      .eq("household_id", householdId)
      .eq("is_primary", true)
      .maybeSingle();

    if (existingPrimary) {
      return {
        content: "The planner is already set up for this household. Use add_household_member for anyone else.",
        isError: true,
      };
    }
  }

  const bodyFatPct = input.body_fat_pct ?? null;
  const targets = calculateProteinTargets({
    ageBand: input.age_band,
    weightLbs: input.weight_lbs,
    bodyFatPct,
    goal: input.goal,
    mealsPerDay: input.meals_per_day,
  });

  const { error } = await supabase.from("people").insert({
    household_id: householdId,
    name: input.name,
    is_primary: isPrimary,
    age_band: input.age_band,
    weight_lbs: input.weight_lbs,
    body_fat_pct: bodyFatPct,
    goal: input.goal,
    meals_per_day: input.meals_per_day,
    avoid_notes: input.avoid_notes ?? null,
    cultural_foods: input.cultural_foods ?? null,
    diet_priority: input.diet_priority ?? null,
    protein_g_day: targets.proteinGDay,
    protein_g_per_meal: targets.proteinGPerMeal,
  });

  if (error) {
    return { content: `Couldn't save: ${error.message}`, isError: true };
  }

  return {
    content: `Saved. ${input.name}'s protein target is ${targets.proteinGDay}g/day, ${targets.proteinGPerMeal}g/meal${
      targets.usedFallback ? " (estimated without body fat on file)" : ""
    }.`,
  };
}

async function saveCapsule(
  supabase: SupabaseClient,
  householdId: string,
  input: {
    proteins: string[];
    carbs: string[];
    produce: string[];
    spices_sauces: string[];
    fats: string[];
    cuisines?: string[];
    recipes?: string;
  }
): Promise<ToolResult> {
  const { error } = await supabase.from("household_capsule").upsert({
    household_id: householdId,
    proteins: input.proteins,
    carbs: input.carbs,
    produce: input.produce,
    spices_sauces: input.spices_sauces,
    fats: input.fats,
    cuisines: input.cuisines ?? [],
    recipes: input.recipes ?? null,
  });

  if (error) {
    return { content: `Couldn't save the capsule: ${error.message}`, isError: true };
  }

  return { content: "Capsule saved." };
}

async function saveKitchenContext(
  supabase: SupabaseClient,
  householdId: string,
  input: {
    cook_skill: string;
    prepared_food_level: string;
    store_tier: string;
  }
): Promise<ToolResult> {
  const { error } = await supabase.from("household_capsule").upsert({
    household_id: householdId,
    cook_skill: input.cook_skill,
    prepared_food_level: input.prepared_food_level,
    store_tier: input.store_tier,
  });

  if (error) {
    return { content: `Couldn't save kitchen context: ${error.message}`, isError: true };
  }

  const { data: primaryPerson } = await supabase
    .from("people")
    .select("id")
    .eq("household_id", householdId)
    .eq("is_primary", true)
    .maybeSingle();

  if (primaryPerson) {
    await supabase
      .from("households")
      .update({ onboarding_state: "complete" })
      .eq("id", householdId);
  }

  return { content: "Kitchen context saved." };
}

export async function executeOnboardingTool(
  supabase: SupabaseClient,
  householdId: string,
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    case "save_planner_profile":
      return savePerson(supabase, householdId, input as unknown as PersonToolInput, true);
    case "add_household_member":
      return savePerson(supabase, householdId, input as unknown as PersonToolInput, false);
    case "save_capsule":
      return saveCapsule(supabase, householdId, input as never);
    case "save_kitchen_context":
      return saveKitchenContext(supabase, householdId, input as never);
    default:
      return { content: `Unknown tool: ${toolName}`, isError: true };
  }
}
