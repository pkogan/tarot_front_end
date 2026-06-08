"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = id.trim();
    if (!trimmed) return;
    setSubmitting(true);
    router.push(`/attempts/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Search eval of the last attempt
          </h1>
          <p className="text-ink-400 text-sm mt-2">
            Enter an id to browse its files.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="id"
            autoFocus
            spellCheck={false}
            autoComplete="off"
            className="flex-1 rounded-lg border border-ink-800 bg-ink-900/40 px-4 py-2.5 font-mono text-sm text-ink-100 placeholder:text-ink-500 outline-none focus:border-ink-600 focus:bg-ink-900/80 transition"
          />
          <button
            type="submit"
            disabled={!id.trim() || submitting}
            className="rounded-lg border border-ink-800 bg-ink-900/60 hover:bg-ink-900 hover:border-ink-700 px-4 py-2.5 text-sm font-medium text-ink-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Searching…" : "Search"}
          </button>
        </form>
      </div>
    </div>
  );
}
