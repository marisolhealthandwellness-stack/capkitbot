export type AgeBand = "under_6" | "6_13" | "14_17" | "18_plus";
export type Goal = "leaner" | "faster" | "stronger" | "energy";

export interface TargetInput {
  ageBand: AgeBand;
  weightLbs: number;
  bodyFatPct: number | null;
  goal: Goal;
  mealsPerDay: number;
}

export interface TargetResult {
  proteinGDay: number;
  proteinGPerMeal: number;
  usedFallback: boolean;
}

/** Rounds x.5 down instead of up, so an estimate lands slightly under rather than over. */
function roundHalfDown(x: number): number {
  return Math.ceil(x - 0.5);
}

export function calculateProteinTargets(input: TargetInput): TargetResult {
  const { ageBand, weightLbs, bodyFatPct, goal, mealsPerDay } = input;

  if (ageBand === "under_6") {
    throw new Error("under_6 is not a supported age band");
  }

  if (ageBand === "6_13") {
    const proteinGDay = roundHalfDown(weightLbs * 0.5);
    return {
      proteinGDay,
      proteinGPerMeal: roundHalfDown(proteinGDay / mealsPerDay),
      usedFallback: false,
    };
  }

  // 14_17 and 18_plus: adult macro logic
  if (goal === "stronger") {
    const proteinGDay = roundHalfDown(weightLbs * 1.0);
    return {
      proteinGDay,
      proteinGPerMeal: roundHalfDown(proteinGDay / mealsPerDay),
      usedFallback: false,
    };
  }

  // leaner / faster / energy
  if (bodyFatPct != null) {
    const leanMass = weightLbs * (1 - bodyFatPct / 100);
    const proteinGDay = roundHalfDown(leanMass * 1.0);
    return {
      proteinGDay,
      proteinGPerMeal: roundHalfDown(proteinGDay / mealsPerDay),
      usedFallback: false,
    };
  }

  // No body fat on file: fixed per-meal fallback.
  const perMeal = weightLbs < 175 ? 25 : 40;
  return {
    proteinGDay: perMeal * mealsPerDay,
    proteinGPerMeal: perMeal,
    usedFallback: true,
  };
}

export function validateAgeBand(ageBand: AgeBand): void {
  if (ageBand === "under_6") {
    throw new Error(
      "CapKitBOT isn't set up for kids under 6 yet, so this person can't be added."
    );
  }
}

export function validateGoalForAgeBand(goal: Goal, ageBand: AgeBand): void {
  if (goal === "leaner" && ageBand !== "18_plus") {
    throw new Error("Leaner is only available for adults (18+).");
  }
}

/** Non-blocking warning surfaced during onboarding/profile edits. */
export function mealsWarning(goal: Goal, mealsPerDay: number): string | null {
  if (goal === "energy" && mealsPerDay < 4) {
    return "Energy is built for 4 or 5 meals a day. Fewer than that still works, but plates will run lighter.";
  }
  if (goal === "stronger" && mealsPerDay === 2) {
    return "At 2 meals, Stronger plates will be very protein-heavy.";
  }
  return null;
}
