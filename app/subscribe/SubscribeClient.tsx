"use client";

import { useState } from "react";
import Link from "next/link";

export function SubscribeClient({
  access,
  subscribed,
  daysLeft,
}: {
  access: boolean;
  subscribed: boolean;
  daysLeft: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(path, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Something went wrong. Try again?");
        setBusy(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Something went wrong. Try again?");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center bg-bone px-6 py-12 text-plum">
      {subscribed ? (
        <>
          <h1 className="font-display text-2xl italic text-plum">You&apos;re subscribed.</h1>
          <p className="mt-2 text-sm text-plum/60">
            Update your card, see invoices, or cancel anytime.
          </p>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            onClick={() => go("/api/billing/portal")}
            disabled={busy}
            className="mt-6 rounded-full bg-spark px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? "Opening…" : "Manage billing"}
          </button>
          <Link href="/chat" className="mt-4 text-sm text-claret underline">
            Back to chat
          </Link>
        </>
      ) : (
        <>
          <h1 className="font-display text-2xl italic text-plum">
            {access ? "Keep CapKitBOT going." : "Your free trial has ended."}
          </h1>
          <p className="mt-2 text-sm text-plum/60">
            {access && daysLeft > 0
              ? `You have ${daysLeft} day${
                  daysLeft === 1 ? "" : "s"
                } left on your free trial. Subscribe anytime to keep access after it ends.`
              : "Subscribe to keep planning meals, batch cooking, and shopping with CapKitBOT."}
          </p>

          <div className="mt-6 rounded-xl border border-plum/10 bg-white p-4">
            <p className="font-medium text-plum">CapKitBOT</p>
            <p className="mt-1 text-2xl font-semibold text-plum">
              $25<span className="text-sm font-normal text-plum/50">/month</span>
            </p>
            <p className="mt-1 text-xs text-plum/50">Cancel anytime.</p>
          </div>

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

          <button
            onClick={() => go("/api/billing/checkout")}
            disabled={busy}
            className="mt-6 rounded-full bg-spark px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? "Starting…" : "Subscribe"}
          </button>

          {access && (
            <Link href="/chat" className="mt-4 text-sm text-claret underline">
              Back to chat
            </Link>
          )}
        </>
      )}
    </main>
  );
}
