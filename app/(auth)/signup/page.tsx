"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { CONSENT_CHECKBOX_LABEL, CONSENT_SUMMARY } from "@/lib/legalCopy";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consented, setConsented] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createBrowserSupabaseClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (!data.session || !data.user) {
      // Email confirmation is enabled on this Supabase project.
      setPendingConfirmation(true);
      setSubmitting(false);
      return;
    }

    const { error: householdError } = await supabase.from("households").insert({
      owner_user_id: data.user.id,
      health_data_consent_at: new Date().toISOString(),
    });

    if (householdError) {
      setError(householdError.message);
      setSubmitting(false);
      return;
    }

    router.push("/setup");
    router.refresh();
  }

  if (pendingConfirmation) {
    return (
      <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center bg-bone px-6 py-12 text-plum">
        <h1 className="font-display text-2xl italic text-plum">Check your email.</h1>
        <p className="mt-2 text-sm text-plum/60">
          We sent a confirmation link to {email}. Follow it, then come back and log in.
        </p>
        <Link href="/login" className="mt-6 text-sm text-claret underline">
          Back to login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-sm flex-col justify-center bg-bone px-6 py-12 text-plum">
      <h1 className="font-display text-3xl italic text-plum">Set up your household.</h1>
      <p className="mt-1 text-sm text-plum/60">
        One login per household. You&apos;ll set up who you&apos;re cooking for once you&apos;re in.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-plum/15 bg-white px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-plum/15 bg-white px-3 py-2 text-plum focus:outline-none focus:border-claret"
          />
        </label>

        <div className="rounded-lg bg-white p-3 text-xs leading-relaxed text-plum/70">
          {CONSENT_SUMMARY}
        </div>

        <label className="flex items-start gap-2 text-xs text-plum/70">
          <input
            type="checkbox"
            required
            checked={consented}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 accent-claret"
          />
          {CONSENT_CHECKBOX_LABEL}
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!consented || submitting}
          className="mt-2 rounded-full bg-spark px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {submitting ? "Setting up..." : "Create household"}
        </button>

        <p className="text-center text-xs text-plum/40">
          <Link href="/legal/terms" className="underline">
            Terms
          </Link>{" "}
          &middot;{" "}
          <Link href="/legal/privacy" className="underline">
            Privacy
          </Link>
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-plum/60">
        Already set up?{" "}
        <Link href="/login" className="text-claret underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
