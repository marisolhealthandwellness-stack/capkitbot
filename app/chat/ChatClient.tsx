"use client";

import { useEffect, useRef, useState } from "react";
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

export function ChatClient({ initialMessages }: { initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const kickedOff = useRef(false);

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
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Something went wrong on my end. Try that again?",
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

  // Brand-new household with no history yet: let the bot open the conversation.
  useEffect(() => {
    if (!kickedOff.current && messages.length === 0) {
      kickedOff.current = true;
      send("Hi");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

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

      {lastAssistant?.chips && lastAssistant.chips.length > 0 && !sending && (
        <ChoiceChips options={lastAssistant.chips} onSelect={send} />
      )}

      <ChatInput onSend={send} disabled={sending} />
    </div>
  );
}
