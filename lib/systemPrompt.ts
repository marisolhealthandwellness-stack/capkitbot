import fs from "fs";
import path from "path";
import type { AgeBand, Goal } from "./targets";

export type CookSkill = "no_cook" | "newbie" | "average" | "chef";
export type PreparedFoodLevel = "from_scratch" | "batch_staples" | "grab_and_go";
export type StoreTier = "budget" | "grocery" | "specialty";

export interface Person {
  id: string;
  name: string;
  isPrimary: boolean;
  ageBand: AgeBand;
  weightLbs: number;
  bodyFatPct: number | null;
  goal: Goal;
  mealsPerDay: number;
  avoidNotes: string | null;
  culturalFoods: string | null;
  dietPriority: string | null;
  proteinGDay: number;
  proteinGPerMeal: number;
}

export interface HouseholdCapsule {
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

const AGE_BAND_LABEL: Record<AgeBand, string> = {
  under_6: "under 6",
  "6_13": "6-13",
  "14_17": "14-17",
  "18_plus": "18+",
};

const CARB_RATIO_BY_GOAL: Record<Goal, string> = {
  leaner: "almost all produce, minimal starch",
  faster: "75% starch, 25% produce",
  stronger: "50/50 produce to starch",
  energy: "50/50, avoid crash sugars",
};

const SIDE_RULE_BY_GOAL: Record<Goal, string> = {
  leaner: "short on protein, add a lean side protein",
  faster: "short on protein, add a side dish",
  stronger: "short on protein, add a side dish",
  energy: "no side, let protein flex down",
};

const COOK_SKILL_LABEL: Record<CookSkill, string> = {
  no_cook: "no cook",
  newbie: "newbie",
  average: "average",
  chef: "chef",
};

const PREPARED_FOOD_LABEL: Record<PreparedFoodLevel, string> = {
  from_scratch: "from scratch",
  batch_staples: "batch staples",
  grab_and_go: "grab & go",
};

const STORE_TIER_LABEL: Record<StoreTier, string> = {
  budget: "Budget (stores like Walmart, Aldi, dollar stores) — favor affordable, widely available staples",
  grocery: "Grocery (stores like Costco, Kroger, Target) — normal supermarket range",
  specialty: "Specialty (stores like Whole Foods, Trader Joe's) — can include specialty or premium ingredients",
};

function formatPerson(person: Person): string {
  const parts: string[] = [];
  const label = person.isPrimary ? `${person.name}, the meal planner` : person.name;
  const bodyFat =
    person.bodyFatPct != null ? `${person.bodyFatPct}% body fat` : "body fat unknown";

  parts.push(
    `- ${label}: ${AGE_BAND_LABEL[person.ageBand]}, ${person.weightLbs} lb, ${bodyFat}, goal ${person.goal}, ${person.mealsPerDay} meals/day.`
  );
  parts.push(
    `Protein ${person.proteinGDay} g/day, ${person.proteinGPerMeal} g/meal.`
  );
  parts.push(`Carbs: ${CARB_RATIO_BY_GOAL[person.goal]}.`);
  parts.push(`Side rule: ${SIDE_RULE_BY_GOAL[person.goal]}.`);
  parts.push(`Avoid: ${person.avoidNotes || "none"}.`);
  parts.push(`Build around: ${person.culturalFoods || "none"}.`);

  if (person.dietPriority) {
    parts.push(`Stated priority: ${person.dietPriority}.`);
  }

  const eligibleForLeucine =
    person.goal === "stronger" && (person.ageBand === "14_17" || person.ageBand === "18_plus");
  if (eligibleForLeucine) {
    parts.push("Leucine: aim 2.5g/meal, flag when low.");
  }

  return parts.join(" ");
}

function formatCapsule(capsule: HouseholdCapsule): string {
  const cuisines =
    capsule.cuisines.length > 0
      ? capsule.cuisines.join(", ")
      : "none, infer from proteins and spices";

  return [
    `Proteins: ${capsule.proteins.join(", ")}.`,
    `Carbs and bases: ${capsule.carbs.join(", ")}.`,
    `Produce: ${capsule.produce.join(", ")}.`,
    `Spices and sauces: ${capsule.spicesSauces.join(", ")}.`,
    `Fats: ${capsule.fats.join(", ")}.`,
    `Cuisines (optional steer): ${cuisines}.`,
    `Pasted recipes: ${capsule.recipes || "none"}.`,
  ].join(" ");
}

function formatKitchenContext(capsule: HouseholdCapsule): string {
  return [
    `Cooking skill: ${COOK_SKILL_LABEL[capsule.cookSkill]}.`,
    `Prepared food reliance: ${PREPARED_FOOD_LABEL[capsule.preparedFoodLevel]}.`,
    `Grocery access: ${STORE_TIER_LABEL[capsule.storeTier]}.`,
  ].join(" ");
}

let cachedBaseTemplate: string | null = null;
let cachedOnboardingTemplate: string | null = null;

function loadBaseTemplate(): string {
  if (cachedBaseTemplate) return cachedBaseTemplate;
  const templatePath = path.join(process.cwd(), "prompts", "base.md");
  cachedBaseTemplate = fs.readFileSync(templatePath, "utf-8");
  return cachedBaseTemplate;
}

export function buildOnboardingSystemPrompt(): string {
  if (cachedOnboardingTemplate) return cachedOnboardingTemplate;
  const templatePath = path.join(process.cwd(), "prompts", "onboarding.md");
  cachedOnboardingTemplate = fs.readFileSync(templatePath, "utf-8");
  return cachedOnboardingTemplate;
}

export function buildSystemPrompt(people: Person[], capsule: HouseholdCapsule): string {
  const template = loadBaseTemplate();

  const householdPeople = people.map(formatPerson).join("\n");
  const capsuleText = formatCapsule(capsule);
  const kitchenContext = formatKitchenContext(capsule);

  return template
    .replace("{{HOUSEHOLD_PEOPLE}}", householdPeople)
    .replace("{{CAPSULE}}", capsuleText)
    .replace("{{KITCHEN_CONTEXT}}", kitchenContext);
}
