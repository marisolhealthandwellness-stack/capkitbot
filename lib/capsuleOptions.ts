// Capsule category definitions: the five functional buckets the bot reasons
// about (proteins / carbs / produce / spices & sauces / fats), each with a cap
// on how many items a household may keep. The cap is what enforces the
// "capsule kitchen" idea — a small, repeated set of ingredients — that the
// bot's brain already assumes ("prepare the same ingredients different ways").

export type CapsuleCategoryKey =
  | "proteins"
  | "carbs"
  | "produce"
  | "spicesSauces"
  | "fats";

export interface CapsuleCategory {
  key: CapsuleCategoryKey;
  label: string;
  cap: number;
  // Tailwind color token from the Marisol palette used to color-code the
  // section (border + selected chip). Orange is never used here — it's
  // reserved for the primary action.
  accent: "claret" | "slate" | "mint" | "rose" | "plum";
  presets: string[];
}

export const CAPSULE_CATEGORIES: CapsuleCategory[] = [
  {
    key: "proteins",
    label: "Proteins",
    cap: 5,
    accent: "claret",
    presets: [
      "Chicken breast",
      "Chicken thighs",
      "Chicken legs",
      "Ground beef",
      "Eggs",
      "Tofu",
      "Salmon",
      "Shrimp",
      "Turkey",
      "Black beans",
      "Greek yogurt",
      "Pork chops",
      "Lentils",
      "Chickpeas",
      "Steak",
      "Tilapia",
      "Tempeh",
      "Cottage cheese",
      "Tuna",
      "Sausage",
      "Edamame",
      "Seitan",
    ],
  },
  {
    key: "carbs",
    label: "Carbs & bases",
    cap: 4,
    accent: "slate",
    presets: [
      "Rice",
      "Bread",
      "Pasta",
      "Tortillas",
      "Potatoes",
      "Quinoa",
      "Oats",
      "Sweet potatoes",
      "Couscous",
      "Naan",
      "Rice noodles",
      "Farro",
      "Corn",
      "Bagels",
      "Grits",
      "Barley",
    ],
  },
  {
    key: "produce",
    label: "Produce",
    cap: 6,
    accent: "mint",
    presets: [
      "Broccoli",
      "Spinach",
      "Bell peppers",
      "Onions",
      "Tomatoes",
      "Carrots",
      "Zucchini",
      "Avocado",
      "Cucumber",
      "Cabbage",
      "Green beans",
      "Mushrooms",
      "Sweet corn",
      "Kale",
      "Cauliflower",
      "Berries",
      "Bananas",
      "Apples",
    ],
  },
  {
    key: "spicesSauces",
    label: "Spices & sauces",
    cap: 8,
    accent: "rose",
    presets: [
      "Garlic",
      "Salt and pepper",
      "Soy sauce",
      "Cumin",
      "Paprika",
      "Hot sauce",
      "Italian seasoning",
      "Chili powder",
      "Ginger",
      "Curry powder",
      "Salsa",
      "BBQ sauce",
      "Taco seasoning",
      "Adobo",
      "Everything bagel seasoning",
    ],
  },
  {
    key: "fats",
    label: "Fats",
    cap: 4,
    accent: "plum",
    presets: [
      "Olive oil",
      "Sesame oil",
      "Butter",
      "Avocado",
      "Peanut butter",
      "Nuts",
      "Seeds",
      "Coconut oil",
      "Tahini",
      "Mayo",
      "Cheese",
      "Ghee",
      "Almond butter",
    ],
  },
];
