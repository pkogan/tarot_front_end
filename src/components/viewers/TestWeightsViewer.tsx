"use client";

import { useState } from "react";
import { JsonViewer } from "./JsonViewer";

type Props = { text: string };

type Test = {
  id?: unknown;
  title?: unknown;
  test_name?: unknown;
  weight?: unknown;
  annotations?: unknown;
  [key: string]: unknown;
};

function isHallucinationTest(annotations: unknown): boolean {
  if (!annotations || typeof annotations !== "object" || Array.isArray(annotations)) {
    return false;
  }
  const v = (annotations as Record<string, unknown>).hallucination_mode_test;
  return v === true;
}

type WeightTone = {
  pill: string;
  block: string;
  label: string;
};

function weightTone(weight: unknown): WeightTone {
  const w = typeof weight === "number" ? weight : NaN;
  if (Number.isNaN(w)) {
    return {
      pill: "bg-ink-700/40 text-ink-300 border-ink-700",
      block: "bg-ink-900/40 border-ink-800",
      label: "text-ink-300",
    };
  }
  if (w > 0) {
    return {
      pill: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
      block: "bg-emerald-500/10 border-emerald-500/30",
      label: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (w < 0) {
    return {
      pill: "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300",
      block: "bg-rose-500/10 border-rose-500/30",
      label: "text-rose-700 dark:text-rose-300",
    };
  }
  return {
    pill: "bg-ink-700/40 text-ink-300 border-ink-700",
    block: "bg-ink-900/40 border-ink-800",
    label: "text-ink-300",
  };
}

function testDisplayName(t: Test): string {
  if (typeof t.test_name === "string" && t.test_name) return t.test_name;
  if (typeof t.title === "string" && t.title) return t.title;
  return "(unnamed test)";
}

export function TestWeightsViewer({ text }: Props) {
  const parsed = parseTests(text);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(
    parsed.ok && parsed.tests.length > 0 ? 0 : null,
  );

  if (!parsed.ok) {
    return <JsonViewer text={text} />;
  }

  const { tests } = parsed;
  const selected =
    selectedIdx !== null && selectedIdx >= 0 && selectedIdx < tests.length
      ? tests[selectedIdx]
      : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
      <div className="rounded-lg border border-ink-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-900/70 text-ink-400 text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-3 py-2 w-12">#</th>
              <th className="text-left font-medium px-3 py-2">Test</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t, i) => {
              const isSel = i === selectedIdx;
              const name = testDisplayName(t);
              const tone = weightTone(t.weight);
              const isHallucination = isHallucinationTest(t.annotations);
              return (
                <tr
                  key={typeof t.id === "string" ? t.id : i}
                  onClick={() => setSelectedIdx(i)}
                  className={`border-t border-ink-800 cursor-pointer align-top ${
                    isSel
                      ? "bg-emerald-500/15 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100"
                      : "hover:bg-ink-800/50 text-ink-200"
                  }`}
                >
                  <td
                    className={`px-3 py-2 font-mono text-xs ${
                      isSel
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-ink-500"
                    }`}
                  >
                    T{i + 1}
                  </td>
                  <td className="px-3 py-2 leading-snug">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap ${tone.pill}`}
                      >
                        AWARDED
                      </span>
                      {isHallucination ? (
                        <span
                          className="inline-flex items-center rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide whitespace-nowrap text-fuchsia-700 dark:text-fuchsia-300"
                          title="Test has hallucination_mode_test = true"
                        >
                          Hallucination
                        </span>
                      ) : null}
                      <span className="min-w-0 font-mono text-xs break-all">
                        {name}
                      </span>
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
          <TestDetails idx={selectedIdx} item={selected} />
        ) : (
          <div className="text-ink-500 text-sm">Select a test to see details.</div>
        )}
      </div>
    </div>
  );
}

function parseTests(
  text: string,
): { ok: false } | { ok: true; tests: Test[] } {
  try {
    const v = JSON.parse(text);
    if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false };
    const arr = (v as Record<string, unknown>).tests;
    if (!Array.isArray(arr) || arr.length === 0) return { ok: false };
    const ok = arr.every(
      (item) =>
        item !== null && typeof item === "object" && !Array.isArray(item),
    );
    if (!ok) return { ok: false };
    return { ok: true, tests: arr as Test[] };
  } catch {
    return { ok: false };
  }
}

function TestDetails({ idx, item }: { idx: number; item: Test }) {
  const { id, title, test_name, weight, annotations, ...rest } = item;
  const name = testDisplayName(item);
  const tone = weightTone(weight);
  const isHallucination = isHallucinationTest(annotations);

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400/80 font-mono">
          T{idx + 1}
        </div>
        <div className="text-ink-100 mt-1 leading-snug font-mono text-[13px] break-all">
          {name}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone.pill}`}
        >
          AWARDED
        </span>
        {isHallucination ? (
          <span className="inline-flex items-center rounded-full border border-fuchsia-500/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-300">
            Hallucination
          </span>
        ) : null}
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
        label="Title"
        value={
          typeof title === "string" && title ? (
            <span className="font-mono text-xs break-all">{title}</span>
          ) : (
            <Empty />
          )
        }
      />
      <KV
        label="Weight"
        value={
          typeof weight === "number" ? (
            <span className={tone.label}>{weight}</span>
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
                  <div className="text-ink-400 font-mono w-44 shrink-0">{k}</div>
                  <div className="text-ink-200 min-w-0 break-words">
                    {renderValue(v)}
                  </div>
                </div>
              ),
            )}
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
