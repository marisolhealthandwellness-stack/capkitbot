"use client";

import { useState } from "react";

type Segment = { type: "text" | "code"; value: string };

// The bot sends plain text, with one exception: the shopping prompt arrives wrapped
// in a triple-backtick code fence (see prompts/base.ts FORMAT). We pull those out and
// render them as a copyable block so the member can paste into a grocery app in one tap.
function parseSegments(content: string): Segment[] {
  const segments: Segment[] = [];
  const fence = /```[^\n]*\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: "code", value: match[1].replace(/\n+$/, "") });
    lastIndex = fence.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: "text", value: content.slice(lastIndex) });
  }
  return segments;
}

function CopyBlock({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the text is still visible to select manually.
    }
  }

  return (
    <div className="my-1.5 overflow-hidden rounded-xl border border-plum/15 bg-bone">
      <div className="flex items-center justify-between border-b border-plum/10 px-3 py-1.5">
        <span className="text-xs font-medium text-plum/50">Shopping prompt</span>
        <button
          onClick={copy}
          className="rounded-full bg-claret px-3 py-1 text-xs font-medium text-bone active:opacity-80"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap px-3 py-2.5 font-sans text-[13px] leading-snug text-plum">
        {text}
      </pre>
    </div>
  );
}

export function ChatBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  const segments = parseSegments(content);
  const hasCode = segments.some((s) => s.type === "code");

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] px-4 py-2 text-[15px] leading-snug ${
          hasCode ? "" : "whitespace-pre-wrap"
        } ${
          isUser
            ? "rounded-tl-2xl rounded-tr-md rounded-bl-2xl rounded-br-2xl bg-mint text-plum"
            : "rounded-tl-md rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-claret text-bone"
        }`}
      >
        {segments.map((seg, i) =>
          seg.type === "code" ? (
            <CopyBlock key={i} text={seg.value} />
          ) : (
            <span key={i} className="whitespace-pre-wrap">
              {seg.value.replace(/^\n+|\n+$/g, "")}
            </span>
          )
        )}
      </div>
    </div>
  );
}
