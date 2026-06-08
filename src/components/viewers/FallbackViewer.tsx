"use client";

import { formatBytes } from "@/lib/format";

export function FallbackViewer({
  src,
  name,
  size,
  contentType,
}: {
  src: string;
  name: string;
  size: number;
  contentType: string;
}) {
  return (
    <div className="bg-ink-900/60 border border-ink-800 rounded-lg p-8 text-center">
      <div className="text-ink-200 font-medium">{name}</div>
      <div className="text-xs text-ink-500 font-mono mt-1">
        {contentType} · {formatBytes(size)}
      </div>
      <p className="text-sm text-ink-400 mt-4 max-w-md mx-auto">
        No inline preview available for this file type.
      </p>
      <a
        href={src}
        download={name}
        className="inline-block mt-5 px-4 py-2 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-sm hover:bg-emerald-500/25"
      >
        Download
      </a>
    </div>
  );
}
