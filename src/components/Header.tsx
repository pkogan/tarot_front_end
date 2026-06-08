"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const ATTEMPT_PATH = /^\/attempts\/([^/?#]+)/;

export function Header({ storageName }: { storageName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const match = pathname?.match(ATTEMPT_PATH);
  const attemptId = match?.[1] ? decodeURIComponent(match[1]) : "";
  const [query, setQuery] = useState(attemptId);
  const isHome = pathname === "/";

  useEffect(() => {
    setQuery(attemptId);
  }, [attemptId]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = query.trim();
    if (!id || id === attemptId) return;
    router.push(`/attempts/${encodeURIComponent(id)}`);
  };

  return (
    <header className="border-b border-ink-800 bg-ink-900/70 backdrop-blur sticky top-0 z-10">
      <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-ink-100 hover:text-white shrink-0"
        >
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="font-semibold tracking-tight">Tarot</span>
        </Link>

        {!isHome && (
          <form
            onSubmit={submit}
            className="ml-auto flex items-center gap-2 min-w-0"
            role="search"
            aria-label="Jump to attempt"
          >
            <div className="relative min-w-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-500 pointer-events-none">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Jump to attempt id…"
                aria-label="Attempt id"
                spellCheck={false}
                autoComplete="off"
                className="pl-7 pr-2 py-1.5 text-xs bg-ink-950 border border-ink-800 rounded-md text-ink-100 placeholder-ink-600 focus:border-emerald-500/50 focus:outline-none w-64 sm:w-80 md:w-96 font-mono"
              />
            </div>
            <button
              type="submit"
              className="text-xs px-2.5 py-1.5 rounded-md border border-ink-800 bg-ink-900 text-ink-300 hover:text-white hover:bg-ink-800 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!query.trim() || query.trim() === attemptId}
            >
              Go
            </button>
          </form>
        )}

        {isHome && <div className="ml-auto" />}

        <span className="text-xs text-ink-400 shrink-0 hidden md:inline">
          storage:{" "}
          <span className="text-ink-200 font-mono">{storageName}</span>
        </span>

        <ThemeToggle />
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="M10.5 10.5 13.5 13.5" />
    </svg>
  );
}
