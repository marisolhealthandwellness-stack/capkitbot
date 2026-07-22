import Link from "next/link";
import { TERMS_OF_SERVICE } from "@/lib/legalCopy";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl bg-bone px-6 py-10">
      <Link href="/" className="text-sm text-claret underline">
        Back
      </Link>
      <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-relaxed text-plum/80">
        {TERMS_OF_SERVICE}
      </pre>
    </main>
  );
}
