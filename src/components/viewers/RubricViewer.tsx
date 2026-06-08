"use client";

import { useEffect, useRef, useState } from "react";
import { JsonViewer } from "./JsonViewer";

type Props = {
  text: string;
  focusId?: string;
  focusToken?: number;
};

type Rubric = {
  id?: unknown;
  title?: unknown;
  weight?: unknown;
  annotations?: unknown;
  rating?: unknown;
  [key: string]: unknown;
};

type Rating = {
  rate?: unknown;
  color?: unknown;
  justification?: unknown;
};

function getRating(item: Rubric): Rating | null {
  const r = item.rating;
  if (r && typeof r === "object" && !Array.isArray(r)) {
    return r as Rating;
  }
  return null;
}

function hasHallucinationMode(annotations: unknown): boolean {
  if (!annotations || typeof annotations !== "object" || Array.isArray(annotations)) {
    return false;
  }
  const v = (annotations as Record<string, unknown>).hallucination_mode;
  return v === true;
}

function formatRate(rate: unknown): string | null {
  if (typeof rate !== "string" || !rate) return null;
  return rate.replace(/_/g, " ").toUpperCase();
}

type RatingTone = {
  pill: string;
  block: string;
  label: string;
};

function ratingTone(rate: unknown, weight: unknown): RatingTone {
  const r = typeof rate === "string" ? rate.toUpperCase() : "";
  const w = typeof weight === "number" ? weight : NaN;
  const isAwarded = r === "AWARDED";
  const effective = isAwarded
    ? w > 0
      ? "green"
      : w < 0
      ? "red"
      : "gray"
    : "gray";
  switch (effective) {
    case "green":
      return {
        pill: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
        block: "bg-emerald-500/10 border-emerald-500/30",
        label: "text-emerald-700 dark:text-emerald-300",
      };
    case "red":
      return {
        pill: "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300",
        block: "bg-rose-500/10 border-rose-500/30",
        label: "text-rose-700 dark:text-rose-300",
      };
    default:
      return {
        pill: "bg-ink-700/40 text-ink-300 border-ink-700",
        block: "bg-ink-900/40 border-ink-800",
        label: "text-ink-300",
      };
  }
}

export function RubricViewer({ text, focusId, focusToken }: Props) {
  const parsed = parseRubrics(text);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    parsed.ok && parsed.rubrics.length > 0 ? 0 : null,
  );
  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const rowRefs = useRef<Map<number, HTMLTableRowElement>>(new Map());

  const rubrics = parsed.ok ? parsed.rubrics : [];

  useEffect(() => {
    if (!focusId) return;
    const idx = rubrics.findIndex((r) => String(r.id) === focusId);
    if (idx === -1) return;
    setSelectedIdx(idx);
    setFlashIdx(idx);
    const row = rowRefs.current.get(idx);
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => setFlashIdx(null), 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusToken]);

  if (!parsed.ok) {
    return <JsonViewer text={text} />;
  }

  const selected =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < rubrics.length
      ? rubrics[selectedIdx]
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
            {rubrics.map((r, i) => {
              const isSel = i === selectedIdx;
              const title =
                typeof r.title === "string" ? r.title : "(no title)";
              const rating = getRating(r);
              const rateLabel = rating ? formatRate(rating.rate) : null;
              const tone = rating
                ? ratingTone(rating.rate, r.weight)
                : null;
              const isHallucination = hasHallucinationMode(r.annotations);
              const isFlash = i === flashIdx;
              return (
                <tr
                  key={typeof r.id === "string" ? r.id : i}
                  ref={(el) => {
                    if (el) rowRefs.current.set(i, el);
                    else rowRefs.current.delete(i);
                  }}
                  onClick={() => setSelectedIdx(i)}
                  className={`border-t border-ink-800 cursor-pointer align-top transition-shadow ${
                    isSel
                      ? "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
                      : "hover:bg-ink-800/50 text-ink-200"
                  } ${
                    isFlash
                      ? "ring-2 ring-inset ring-sky-500/70 dark:ring-sky-400/70"
                      : ""
                  }`}
                >
                  <td
                    className={`px-3 py-2 font-mono text-xs ${
                      isSel
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-ink-500"
                    }`}
                  >
                    R{i + 1}
                  </td>
                  <td className="px-3 py-2 leading-snug">
                    <div className="flex items-start gap-2 flex-wrap">
                      {rateLabel && tone ? (
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap ${tone.pill}`}
                        >
                          {rateLabel}
                        </span>
                      ) : null}
                      {isHallucination ? (
                        <span
                          className="inline-flex items-center rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap text-fuchsia-700 dark:text-fuchsia-300"
                          title="Rubric criteria has hallucination_mode = true"
                        >
                          Hallucination
                        </span>
                      ) : null}
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
          <RubricDetails idx={selectedIdx} item={selected} />
        ) : (
          <div className="text-ink-500 text-sm">
            Select a rubric to see details.
          </div>
        )}
      </div>
    </div>
  );
}

function parseRubrics(
  text: string,
): { ok: false } | { ok: true; rubrics: Rubric[] } {
  try {
    const v = JSON.parse(text);
    if (!Array.isArray(v) || v.length === 0) return { ok: false };
    const ok = v.every(
      (item) =>
        item !== null &&
        typeof item === "object" &&
        !Array.isArray(item) &&
        "title" in item,
    );
    if (!ok) return { ok: false };
    return { ok: true, rubrics: v as Rubric[] };
  } catch {
    return { ok: false };
  }
}

function RubricDetails({ idx, item }: { idx: number; item: Rubric }) {
  const { id, title, weight, annotations, rating, ...rest } = item;
  const ratingObj = getRating(item);
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400/80 font-mono">
          R{idx + 1}
        </div>
        <div className="text-ink-100 mt-1 leading-snug">
          {typeof title === "string" ? title : "(no title)"}
        </div>
      </div>

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
      <KV
        label="Weight"
        value={
          typeof weight === "number" ? (
            <span className="text-sky-700 dark:text-sky-300">{weight}</span>
          ) : weight !== undefined ? (
            <span>{String(weight)}</span>
          ) : (
            <Empty />
          )
        }
      />

      {annotations && typeof annotations === "object" && !Array.isArray(annotations) ? (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
            Annotations
          </div>
          <div className="rounded border border-ink-800 bg-ink-950/40 divide-y divide-ink-800">
            {Object.entries(annotations as Record<string, unknown>).map(
              ([k, v]) => (
                <div
                  key={k}
                  className="px-3 py-1.5 flex items-start gap-3 text-xs"
                >
                  <div className="text-ink-400 font-mono w-40 shrink-0">
                    {k}
                  </div>
                  <div className="text-ink-200 min-w-0 break-words">
                    {renderValue(v)}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {ratingObj ? <RatingBlock rating={ratingObj} weight={weight} /> : null}

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

function RatingBlock({
  rating,
  weight,
}: {
  rating: Rating;
  weight: unknown;
}) {
  const tone = ratingTone(rating.rate, weight);
  const rateLabel = formatRate(rating.rate) ?? "—";
  const justification =
    typeof rating.justification === "string" ? rating.justification : null;
  const colorLabel =
    typeof rating.color === "string" && rating.color ? rating.color : null;
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
        Rating
      </div>
      <div className={`rounded border ${tone.block} p-3 space-y-2`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone.pill}`}
          >
            {rateLabel}
          </span>
          {colorLabel ? (
            <span className="text-[11px] text-ink-500 font-mono">
              color: {colorLabel}
            </span>
          ) : null}
        </div>
        {justification ? (
          <div className="text-xs text-ink-200 leading-relaxed whitespace-pre-wrap break-words">
            {justification}
          </div>
        ) : null}
      </div>
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
