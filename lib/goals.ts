import type { Goal } from "./targets";

// Display metadata for the four Sprint goals. The keys and behavior live in the
// bot's brain (prompts/base.ts) and the calculator (lib/targets.ts); this only
// controls how each goal is labelled and described in the UI.
export interface GoalMeta {
  value: Goal;
  label: string;
  blurb: string;
  adultOnly: boolean;
}

export const GOAL_META: GoalMeta[] = [
  {
    value: "leaner",
    label: "Leaner",
    blurb: "Lose fat, keep muscle. Protein high, carbs mostly vegetables.",
    adultOnly: true,
  },
  {
    value: "faster",
    label: "Faster",
    blurb: "Fuel training and endurance. Protein high, carbs lean on starches.",
    adultOnly: false,
  },
  {
    value: "stronger",
    label: "Stronger",
    blurb: "Build muscle and strength. Highest protein, balanced carbs.",
    adultOnly: false,
  },
  {
    value: "energy",
    label: "Energy",
    blurb: "Steady energy all day. Spread over 4–5 smaller meals, no crashes.",
    adultOnly: false,
  },
];
