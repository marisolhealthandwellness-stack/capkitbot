import Link from "next/link";
import { PRIVACY_POLICY } from "@/lib/legalCopy";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl bg-bone px-6 py-10">
      <Link href="/" className="text-sm text-claret underline">
        Back
      </Link>
      <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-plum/80">
        {PRIVACY_POLICY}
      </pre>
    </main>
  );
}
