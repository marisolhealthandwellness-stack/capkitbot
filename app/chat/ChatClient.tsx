"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChatBubble } from "@/components/ChatBubble";
import { ChoiceChips } from "@/components/ChoiceChips";
import { ChatInput } from "@/components/ChatInput";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  chips: string[] | null;
}

// The core things people open the app to do. Shown above the input whenever the
// bot isn't already offering its own chips, so they're always one tap away.
const QUICK_ACTIONS = [
  "What should I eat?",
  "Cook what I have",
  "I'm hungry",
  "Meal prep",
];

export function ChatClient({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    setSending(true);
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text, chips: null },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();

      if (!res.ok) {
        const detail = data?.detail
          ? `\n\n(Detail: ${data.detail}${data.status ? `, status ${data.status}` : ""})`
          : "";
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Something went wrong on my end. Try that again?${detail}`,
            chips: null,
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: data.reply, chips: data.chips },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const botChips =
    lastAssistant?.chips && lastAssistant.chips.length > 0 ? lastAssistant.chips : null;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-plum/10 bg-bone px-4 py-3">
        <span className="flex items-baseline gap-0.5 font-semibold text-plum">
          CapKitBOT<span className="text-lg leading-none text-spark">&middot;</span>
        </span>
        <div className="flex gap-4 text-sm">
          <Link href="/profile" className="text-claret underline">
            Profile
          </Link>
          <button onClick={signOut} className="text-slate">
            Sign out
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-bone px-3 py-4">
        <div className="flex flex-col gap-3">
          {messages.length === 0 && !sending && (
            <div className="mt-6 px-2 text-center">
              <p className="font-display text-xl italic text-plum">You&apos;re all set.</p>
              <p className="mx-auto mt-2 max-w-xs text-sm text-plum/60">
                Ask me what to eat, tell me you&apos;re hungry, or tap one of the
                shortcuts below to get going.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <ChatBubble key={m.id} role={m.role} content={m.content} />
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-tl-md rounded-tr-2xl rounded-bl-2xl rounded-br-2xl bg-claret px-4 py-2 text-sm text-bone/70">
                &hellip;
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {!sending &&
        (botChips ? (
          <ChoiceChips options={botChips} onSelect={send} />
        ) : (
          <ChoiceChips options={QUICK_ACTIONS} onSelect={send} />
        ))}

      <ChatInput onSend={send} disabled={sending} />
    </div>
  );
}
