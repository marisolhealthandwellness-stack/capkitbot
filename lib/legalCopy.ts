export const CONSENT_SUMMARY = `CapKitBOT stores what your household enters — names, weight, body fat percentage (if you share it), and children's age ranges (never an exact age) — so it can calculate personal protein targets and give relevant meal suggestions. It's used only to run the app for your household, never sold, and you can ask to have it deleted at any time.

CapKitBOT doesn't collect anyone's sex, and it doesn't diagnose, treat, or track any medical condition.`;

export const CONSENT_CHECKBOX_LABEL =
  "I understand and agree to CapKitBOT storing this information for my household's use of the app.";

export const TERMS_OF_SERVICE = `CapKitBOT — Terms of Service (draft)

Last updated: this is a placeholder draft, not reviewed by a lawyer. Replace before charging users money for this product.

1. What this is
CapKitBOT is a meal-planning and nutrition-support assistant for households that have completed the capsule kitchen program. It suggests meals, calculates protein targets from information you provide, and helps you cook from what you have on hand.

2. Not medical advice
CapKitBOT is not a doctor, dietitian, or therapist. It does not diagnose or treat any condition. Nutrition targets are estimates based on the information you provide, not medical guidance. Talk to a qualified professional about any health concern.

3. Your account
One login represents one household. You're responsible for keeping your login credentials private and for the accuracy of what you enter about the people in your household.

4. Acceptable use
Don't use CapKitBOT to store information about people outside your household without their knowledge, and don't rely on it as the sole source of nutrition guidance for a diagnosed medical condition.

5. Changes
We may update these terms as the product changes. Continued use after an update means you accept the revised terms.

6. Contact
Questions about these terms should go to the household that operates this CapKitBOT instance.`;

export const PRIVACY_POLICY = `CapKitBOT — Privacy Policy (draft)

Last updated: this is a placeholder draft, not reviewed by a lawyer. Replace before charging users money for this product.

What we collect
- Account: your email address and password (password is never stored in plain text — handled by Supabase Auth).
- Household members: names, weight, body fat percentage (optional), age range for children (never an exact birthdate), stated goals, meals per day, foods to avoid, and any stated dietary priority.
- Kitchen setup: the foods your household keeps and cooks, cooking skill level, and grocery access.
- Conversation history: your chat messages with CapKitBOT, so it can hold context across a conversation and so you can review past meal suggestions.

What we don't collect
We don't ask anyone's sex. We don't collect exact ages for children. We don't diagnose or track medical conditions.

How it's used
Solely to run CapKitBOT for your household: calculating protein targets, generating meal suggestions, and remembering your household's setup so you don't have to repeat it. Your household's data is never shown to other households.

Where it's stored
Data is stored with Supabase (a database provider) and processed by Anthropic's Claude API to generate chat responses. Neither is used to train AI models on your data by default.

Your rights
You can ask to have your household's data exported or deleted at any time.`;
