import { describe, expect, it } from "vitest";
import {
  calculateProteinTargets,
  mealsWarning,
  validateAgeBand,
  validateGoalForAgeBand,
} from "./targets";

describe("calculateProteinTargets calibration cases", () => {
  it("215 lb, 30% bf, faster, 3 meals -> 150 g/day, 50 g/meal", () => {
    const result = calculateProteinTargets({
      ageBand: "18_plus",
      weightLbs: 215,
      bodyFatPct: 30,
      goal: "faster",
      mealsPerDay: 3,
    });
    expect(result.proteinGDay).toBe(150);
    expect(result.proteinGPerMeal).toBe(50);
  });

  it("175 lb, 40% bf, leaner (18+), 3 meals -> 105 g/day, 35 g/meal", () => {
    const result = calculateProteinTargets({
      ageBand: "18_plus",
      weightLbs: 175,
      bodyFatPct: 40,
      goal: "leaner",
      mealsPerDay: 3,
    });
    expect(result.proteinGDay).toBe(105);
    expect(result.proteinGPerMeal).toBe(35);
  });

  it("220 lb, stronger, 4 meals -> 220 g/day, 55 g/meal", () => {
    const result = calculateProteinTargets({
      ageBand: "18_plus",
      weightLbs: 220,
      bodyFatPct: null,
      goal: "stronger",
      mealsPerDay: 4,
    });
    expect(result.proteinGDay).toBe(220);
    expect(result.proteinGPerMeal).toBe(55);
  });

  it("70 lb, age 6_13, any goal, 3 meals -> 35 g/day, 12 g/meal", () => {
    for (const goal of ["leaner", "faster", "stronger", "energy"] as const) {
      const result = calculateProteinTargets({
        ageBand: "6_13",
        weightLbs: 70,
        bodyFatPct: null,
        goal,
        mealsPerDay: 3,
      });
      expect(result.proteinGDay).toBe(35);
      expect(result.proteinGPerMeal).toBe(12);
    }
  });

  it("160 lb, no body fat, faster, 3 meals -> fallback 25 g/meal, 75 g/day", () => {
    const result = calculateProteinTargets({
      ageBand: "18_plus",
      weightLbs: 160,
      bodyFatPct: null,
      goal: "faster",
      mealsPerDay: 3,
    });
    expect(result.proteinGPerMeal).toBe(25);
    expect(result.proteinGDay).toBe(75);
    expect(result.usedFallback).toBe(true);
  });

  it("180 lb, no body fat, leaner, 3 meals -> fallback 40 g/meal, 120 g/day", () => {
    const result = calculateProteinTargets({
      ageBand: "18_plus",
      weightLbs: 180,
      bodyFatPct: null,
      goal: "leaner",
      mealsPerDay: 3,
    });
    expect(result.proteinGPerMeal).toBe(40);
    expect(result.proteinGDay).toBe(120);
    expect(result.usedFallback).toBe(true);
  });
});

describe("validation", () => {
  it("rejects under_6", () => {
    expect(() => validateAgeBand("under_6")).toThrow();
    expect(() =>
      calculateProteinTargets({
        ageBand: "under_6",
        weightLbs: 40,
        bodyFatPct: null,
        goal: "faster",
        mealsPerDay: 3,
      })
    ).toThrow();
  });

  it("rejects leaner for anyone under 18", () => {
    expect(() => validateGoalForAgeBand("leaner", "14_17")).toThrow();
    expect(() => validateGoalForAgeBand("leaner", "6_13")).toThrow();
    expect(() => validateGoalForAgeBand("leaner", "18_plus")).not.toThrow();
  });
});

describe("mealsWarning", () => {
  it("warns on energy below 4 meals", () => {
    expect(mealsWarning("energy", 3)).not.toBeNull();
    expect(mealsWarning("energy", 4)).toBeNull();
  });

  it("warns on stronger at exactly 2 meals", () => {
    expect(mealsWarning("stronger", 2)).not.toBeNull();
    expect(mealsWarning("stronger", 3)).toBeNull();
  });

  it("no warning for other combinations", () => {
    expect(mealsWarning("faster", 2)).toBeNull();
    expect(mealsWarning("leaner", 3)).toBeNull();
  });
});
