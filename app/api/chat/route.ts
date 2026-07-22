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

export const runtime = "nodejs";

const MAX_TOOL_ITERATIONS = 5;

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
      tools = undefined;
    }
  }

  const client = createAnthropicClient();
  let finalText = "";

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
      ...(tools ? { tools } : {}),
    });

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    finalText = textBlocks.map((b) => b.text).join("\n");

    if (response.stop_reason !== "tool_use") {
      break;
    }

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
  }

  const { text: cleanedText, chips } = parseChips(finalText || "Let's keep going.");

  await saveMessage(supabase, household.id, "assistant", cleanedText, chips);

  return NextResponse.json({ reply: cleanedText, chips });
}
