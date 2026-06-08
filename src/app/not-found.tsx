import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-xl border border-ink-800 bg-ink-900/40 p-10 text-center">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-ink-400 text-sm mt-2">
        That attempt or file is not in storage.
      </p>
      <Link
        href="/"
        className="inline-block mt-5 text-sm text-emerald-700 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200 underline underline-offset-4"
      >
        ← Back to attempts
      </Link>
    </div>
  );
}
