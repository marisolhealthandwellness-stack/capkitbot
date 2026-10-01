import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAnthropicClient, MODEL } from "@/lib/anthropicClient";
import { buildOnboardingSystemPrompt, buildSystemPrompt } from "@/lib/systemPrompt";
import {
  getCapsule,
  getHouseholdForUser,
  getPeople,
  getRecentMessages,
  saveMessage,
} from "@/lib/household";
import { executeOnboardingTool, ONBOARDING_TOOLS } from "@/lib/extract";
import { BILLING_ENABLED, getBilling, hasAccess } from "@/lib/billing";

export const runtime = "nodejs";

const MAX_TOOL_ITERATIONS = 5;

// Anthropic server-side web search. Cast because this SDK version's types predate
// the tool. Attached only on the "Full recipe" turn (see below) to keep cost down —
// a search is roughly a cent, and we never want one on an ordinary meal reply.
const WEB_SEARCH_TOOL = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: 3,
} as unknown as Anthropic.Tool;

function parseChips(text: string): { text: string; chips: string[] | null } {
  const lines = text.split("\n");
  const chipLineIndex = lines.findIndex((line) => line.trim().startsWith("CHIPS:"));

  if (chipLineIndex === -1) {
    return { text: text.trim(), chips: null };
  }

  const chipLine = lines[chipLineIndex].trim();
  const options = chipLine
    .slice("CHIPS:".length)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  const remaining = [...lines.slice(0, chipLineIndex), ...lines.slice(chipLineIndex + 1)]
    .join("\n")
    .trim();

  return { text: remaining, chips: options.length > 0 ? options : null };
}

export async function POST(request: Request) {
  try {
    return await handleChat(request);
  } catch (err) {
    // Surface the failure as JSON so the client shows an error instead of
    // dying silently. The detail is logged to the Netlify function log and,
    // during setup, echoed to the client to make diagnosis easy.
    console.error("[/api/chat] failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    const status =
      typeof (err as { status?: number })?.status === "number"
        ? (err as { status: number }).status
        : undefined;
    return NextResponse.json(
      { error: "CapKitBOT hit a problem generating a reply.", detail, status },
      { status: 500 }
    );
  }
}

async function handleChat(request: Request) {
  const body = await request.json();
  const message: unknown = body?.message;

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const household = await getHouseholdForUser(supabase, user.id);
  if (!household) {
    return NextResponse.json({ error: "No household found" }, { status: 404 });
  }

  // Backstop the page-level gate: no active trial/subscription, no bot.
  if (BILLING_ENABLED && !hasAccess(await getBilling(supabase, household.id))) {
    return NextResponse.json({ error: "subscription_required" }, { status: 402 });
  }

  await saveMessage(supabase, household.id, "user", message);

  const history = await getRecentMessages(supabase, household.id, 20);
  let anthropicMessages: Anthropic.MessageParam[] = history
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const onboarding = household.onboarding_state !== "complete";

  let systemPrompt: string;
  let tools: Anthropic.Tool[] | undefined;

  if (onboarding) {
    systemPrompt = buildOnboardingSystemPrompt();
    tools = ONBOARDING_TOOLS;
  } else {
    const [people, capsule] = await Promise.all([
      getPeople(supabase, household.id),
      getCapsule(supabase, household.id),
    ]);

    if (!capsule) {
      // Defensive fallback: onboarding_state says complete but the capsule
      // row is missing. Drop back into onboarding rather than error out.
      systemPrompt = buildOnboardingSystemPrompt();
      tools = ONBOARDING_TOOLS;
    } else {
      systemPrompt = buildSystemPrompt(people, capsule);
      // Give the model web search ONLY when the member is asking for a full recipe
      // (the "Full recipe" follow-up chip sends exactly that text). This keeps web
      // search — and its per-search cost — off every normal meal reply.
      tools = /full recipe/i.test(message) ? [WEB_SEARCH_TOOL] : undefined;
    }
  }

  const client = createAnthropicClient();
  const textParts: string[] = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
      ...(tools ? { tools } : {}),
    });

    const turnText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((b) => b.text)
      .join("\n");
    if (turnText.trim()) textParts.push(turnText);

    // "pause_turn" isn't in this SDK version's stop_reason union; compare as string.
    const stop = response.stop_reason as string | null;

    if (stop === "tool_use") {
      // Client-side tools (onboarding extraction). Run them and loop.
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      anthropicMessages = [
        ...anthropicMessages,
        { role: "assistant", content: response.content },
      ];

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const toolUse of toolUseBlocks) {
        const result = await executeOnboardingTool(
          supabase,
          household.id,
          toolUse.name,
          toolUse.input as Record<string, unknown>
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result.content,
          is_error: result.isError,
        });
      }

      anthropicMessages = [...anthropicMessages, { role: "user", content: toolResults }];
      continue;
    }

    if (stop === "pause_turn") {
      // A server tool (web search) is mid-flight. Resubmit with the partial
      // assistant turn appended; the server resolves the tool itself, so there is
      // no tool_result for us to provide.
      anthropicMessages = [
        ...anthropicMessages,
        { role: "assistant", content: response.content },
      ];
      continue;
    }

    break;
  }

  const finalText = textParts.join("\n");
  const { text: cleanedText, chips } = parseChips(finalText || "Let's keep going.");

  await saveMessage(supabase, household.id, "assistant", cleanedText, chips);

  return NextResponse.json({ reply: cleanedText, chips });
}
