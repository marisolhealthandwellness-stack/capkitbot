import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgeBand, Goal } from "./targets";
import type { CookSkill, HouseholdCapsule, Person, PreparedFoodLevel, StoreTier } from "./systemPrompt";

export interface HouseholdRow {
  id: string;
  owner_user_id: string;
  name: string;
  onboarding_state: string;
  health_data_consent_at: string | null;
  created_at: string;
}

interface PersonRow {
  id: string;
  household_id: string;
  name: string;
  is_primary: boolean;
  age_band: AgeBand;
  weight_lbs: number;
  body_fat_pct: number | null;
  goal: Goal;
  meals_per_day: number;
  avoid_notes: string | null;
  cultural_foods: string | null;
  diet_priority: string | null;
  protein_g_day: number;
  protein_g_per_meal: number;
}

interface CapsuleRow {
  household_id: string;
  proteins: string[];
  carbs: string[];
  produce: string[];
  spices_sauces: string[];
  fats: string[];
  cuisines: string[];
  recipes: string | null;
  cook_skill: CookSkill | null;
  prepared_food_level: PreparedFoodLevel | null;
  store_tier: StoreTier | null;
}

export interface ChatMessageRow {
  id: string;
  household_id: string;
  role: "user" | "assistant" | "system_event";
  content: string;
  chips: string[] | null;
  created_at: string;
}

export async function getHouseholdForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<HouseholdRow | null> {
  const { data, error } = await supabase
    .from("households")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPeople(
  supabase: SupabaseClient,
  householdId: string
): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select("*")
    .eq("household_id", householdId)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data as PersonRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    isPrimary: row.is_primary,
    ageBand: row.age_band,
    weightLbs: row.weight_lbs,
    bodyFatPct: row.body_fat_pct,
    goal: row.goal,
    mealsPerDay: row.meals_per_day,
    avoidNotes: row.avoid_notes,
    culturalFoods: row.cultural_foods,
    dietPriority: row.diet_priority,
    proteinGDay: row.protein_g_day,
    proteinGPerMeal: row.protein_g_per_meal,
  }));
}

export async function getCapsule(
  supabase: SupabaseClient,
  householdId: string
): Promise<HouseholdCapsule | null> {
  const { data, error } = await supabase
    .from("household_capsule")
    .select("*")
    .eq("household_id", householdId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as CapsuleRow;
  return {
    proteins: row.proteins,
    carbs: row.carbs,
    produce: row.produce,
    spicesSauces: row.spices_sauces,
    fats: row.fats,
    cuisines: row.cuisines,
    recipes: row.recipes,
    cookSkill: row.cook_skill ?? "average",
    preparedFoodLevel: row.prepared_food_level ?? "batch_staples",
    storeTier: row.store_tier ?? "grocery",
  };
}

export async function isOnboardingComplete(
  supabase: SupabaseClient,
  household: HouseholdRow
): Promise<boolean> {
  return household.onboarding_state === "complete";
}

export async function getRecentMessages(
  supabase: SupabaseClient,
  householdId: string,
  limit = 20
): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as ChatMessageRow[]).reverse();
}

export async function saveMessage(
  supabase: SupabaseClient,
  householdId: string,
  role: "user" | "assistant" | "system_event",
  content: string,
  chips: string[] | null = null
): Promise<void> {
  const { error } = await supabase.from("chat_messages").insert({
    household_id: householdId,
    role,
    content,
    chips,
  });
  if (error) throw error;
}
