import Anthropic from "@anthropic-ai/sdk";

// Kept in one place so a retired model string only needs updating here.
export const MODEL = "claude-sonnet-5";

export function createAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
