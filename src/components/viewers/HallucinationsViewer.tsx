"use client";

import { useState } from "react";
import { JsonViewer } from "./JsonViewer";

type Props = { text: string };

type Hallucination = {
  id?: unknown;
  title?: unknown;
  annotations?: unknown;
  [key: string]: unknown;
};

const HALLUCINATION_PILL =
  "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/40 dark:text-fuchsia-300";

function getAnnotations(item: Hallucination): Record<string, unknown> | null {
  const a = item.annotations;
  if (a && typeof a === "object" && !Array.isArray(a)) {
    return a as Record<string, unknown>;
  }
  return null;
}

function getCategories(annotations: Record<string, unknown> | null): string[] {
  if (!annotations) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(annotations)) {
    if (/^hallucination_\d+_category$/.test(k)) {
      if (Array.isArray(v)) {
        for (const x of v) if (typeof x === "string" && x) out.push(x);
      } else if (typeof v === "string" && v) {
        out.push(v);
      }
    }
  }
  return out;
}

function getSteps(annotations: Record<string, unknown> | null): string[] {
  if (!annotations) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(annotations)) {
    if (/^hallucination_\d+_step$/.test(k) && typeof v === "string" && v) {
      out.push(v);
    }
  }
  return out;
}

function getJustification(
  annotations: Record<string, unknown> | null,
): string | null {
  if (!annotations) return null;
  const v = annotations.category_justification;
  return typeof v === "string" && v ? v : null;
}

function formatCategoryLabel(c: string): string {
  return c.replace(/_/g, " ").replace(/-/g, " · ");
}

export function HallucinationsViewer({ text }: Props) {
  const parsed = parseHallucinations(text);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    parsed.ok && parsed.items.length > 0 ? 0 : null,
  );

  if (!parsed.ok) {
    return <JsonViewer text={text} />;
  }

  const { items } = parsed;
  const selected =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < items.length
      ? items[selectedIdx]
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
      <div className="rounded-lg border border-ink-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-900/70 text-ink-400 text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-3 py-2 w-12">#</th>
              <th className="text-left font-medium px-3 py-2">Title</th>
            </tr>
          </thead>
          <tbody>
            {items.map((h, i) => {
              const isSel = i === selectedIdx;
              const ann = getAnnotations(h);
              const steps = getSteps(ann);
              const title =
                typeof h.title === "string" ? h.title : "(no title)";
              return (
                <tr
                  key={typeof h.id === "string" ? h.id : i}
                  onClick={() => setSelectedIdx(i)}
                  className={`border-t border-ink-800 cursor-pointer align-top ${
                    isSel
                      ? "bg-fuchsia-500/15 text-fuchsia-900 dark:bg-fuchsia-500/10 dark:text-fuchsia-100"
                      : "hover:bg-ink-800/50 text-ink-200"
                  }`}
                >
                  <td
                    className={`px-3 py-2 font-mono text-xs ${
                      isSel
                        ? "text-fuchsia-700 dark:text-fuchsia-300"
                        : "text-ink-500"
                    }`}
                  >
                    H{i + 1}
                  </td>
                  <td className="px-3 py-2 leading-snug">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap ${HALLUCINATION_PILL}`}
                      >
                        Hallucination
                      </span>
                      {steps.map((s, si) => (
                        <span
                          key={si}
                          className="inline-flex items-center rounded-full border border-ink-700 bg-ink-800/60 px-2 py-0.5 text-[10px] font-mono text-ink-300 whitespace-nowrap"
                        >
                          {s}
                        </span>
                      ))}
                      <span className="min-w-0">{title}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-4 lg:sticky lg:top-0 lg:self-start">
        {selected && selectedIdx !== null ? (
          <HallucinationDetails idx={selectedIdx} item={selected} />
        ) : (
          <div className="text-ink-500 text-sm">
            Select a hallucination to see details.
          </div>
        )}
      </div>
    </div>
  );
}

function parseHallucinations(
  text: string,
): { ok: false } | { ok: true; items: Hallucination[] } {
  try {
    const v = JSON.parse(text);
    if (!Array.isArray(v) || v.length === 0) return { ok: false };
    const ok = v.every(
      (item) =>
        item !== null && typeof item === "object" && !Array.isArray(item),
    );
    if (!ok) return { ok: false };
    return { ok: true, items: v as Hallucination[] };
  } catch {
    return { ok: false };
  }
}

function HallucinationDetails({
  idx,
  item,
}: {
  idx: number;
  item: Hallucination;
}) {
  const { id, title, annotations, ...rest } = item;
  const ann = getAnnotations(item);
  const categories = getCategories(ann);
  const steps = getSteps(ann);
  const justification = getJustification(ann);

  // Remaining annotation keys not already surfaced above.
  const surfaced = new Set<string>(["category_justification"]);
  if (ann) {
    for (const k of Object.keys(ann)) {
      if (/^hallucination_\d+_(category|step)$/.test(k)) surfaced.add(k);
    }
  }
  const remainingAnnotations = ann
    ? Object.entries(ann).filter(([k]) => !surfaced.has(k))
    : [];

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-400/80 font-mono">
          H{idx + 1}
        </div>
        <div className="text-ink-100 mt-1 leading-snug">
          {typeof title === "string" ? title : "(no title)"}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${HALLUCINATION_PILL}`}
        >
          Hallucination
        </span>
        {steps.map((s, si) => (
          <span
            key={si}
            className="inline-flex items-center rounded-full border border-ink-700 bg-ink-800/60 px-2 py-0.5 text-[10px] font-mono text-ink-300"
          >
            {s}
          </span>
        ))}
      </div>

      {categories.length > 0 ? (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
            Categories
          </div>
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c, ci) => (
              <span
                key={ci}
                className="inline-flex items-center rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[11px] text-fuchsia-700 dark:text-fuchsia-300"
                title={c}
              >
                {formatCategoryLabel(c)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {justification ? (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
            Justification
          </div>
          <div className="rounded border border-fuchsia-500/30 bg-fuchsia-500/10 p-3 text-xs text-ink-200 leading-relaxed whitespace-pre-wrap break-words">
            {justification}
          </div>
        </div>
      ) : null}

      <div className="border-t border-ink-800" />

      <KV
        label="ID"
        value={
          typeof id === "string" || typeof id === "number" ? (
            <span className="font-mono text-xs break-all">{String(id)}</span>
          ) : (
            <Empty />
          )
        }
      />

      {remainingAnnotations.length > 0 ? (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
            Other annotations
          </div>
          <div className="rounded border border-ink-800 bg-ink-950/40 divide-y divide-ink-800">
            {remainingAnnotations.map(([k, v]) => (
              <div
                key={k}
                className="px-3 py-1.5 flex items-start gap-3 text-xs"
              >
                <div className="text-ink-400 font-mono w-44 shrink-0">{k}</div>
                <div className="text-ink-200 min-w-0 break-words">
                  {renderValue(v)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {Object.keys(rest).length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
            Other
          </div>
          <pre className="text-[11px] font-mono bg-ink-950/40 border border-ink-800 rounded p-2 overflow-x-auto scroll-thin">
            {JSON.stringify(rest, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <div className="text-ink-500 uppercase tracking-wide w-20 shrink-0 pt-0.5">
        {label}
      </div>
      <div className="text-ink-200 min-w-0 break-words">{value}</div>
    </div>
  );
}

function Empty() {
  return <span className="text-ink-600">—</span>;
}

function renderValue(v: unknown): React.ReactNode {
  if (v === null) return <span className="text-ink-500">null</span>;
  if (typeof v === "boolean")
    return (
      <span className="text-amber-700 dark:text-amber-300">{String(v)}</span>
    );
  if (typeof v === "number")
    return <span className="text-sky-700 dark:text-sky-300">{String(v)}</span>;
  if (typeof v === "string") return <span>{v}</span>;
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-ink-500">[]</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {v.map((x, i) => (
          <span
            key={i}
            className="rounded bg-ink-800/80 px-1.5 py-0.5 text-[11px] text-ink-200"
          >
            {typeof x === "object" ? JSON.stringify(x) : String(x)}
          </span>
        ))}
      </div>
    );
  }
  return <span className="font-mono">{JSON.stringify(v)}</span>;
}
