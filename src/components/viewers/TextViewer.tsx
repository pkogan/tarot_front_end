"use client";

export function TextViewer({ text }: { text: string }) {
  return (
    <pre className="text-xs font-mono bg-ink-900/60 border border-ink-800 rounded-lg p-4 overflow-auto scroll-thin whitespace-pre-wrap leading-relaxed">
      {text}
    </pre>
  );
}
