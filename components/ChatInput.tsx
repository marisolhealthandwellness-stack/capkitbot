"use client";

import { useState } from "react";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <div className="flex items-end gap-2 border-t border-neutral-200 bg-white p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder="Message CapKitBOT"
        className="max-h-32 flex-1 resize-none rounded-2xl border border-neutral-300 px-4 py-2 text-[15px] focus:outline-none"
      />
      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="rounded-full bg-bubbleUser px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        Send
      </button>
    </div>
  );
}
