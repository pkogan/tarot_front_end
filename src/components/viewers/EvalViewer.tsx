"use client";

import { useState } from "react";
import { JsonViewer } from "./JsonViewer";

type Props = {
  text: string;
  onOpenFile?: (path: string) => void;
  onOpenFileWithFocus?: (path: string, criterionId: string) => void;
  fileExists?: (path: string) => boolean;
};

type Dimension = {
  name?: unknown;
  rating?: unknown;
  category?: unknown;
  evidence?: unknown;
  fix_suggestion?: unknown;
  [key: string]: unknown;
};

type Issue = {
  id?: unknown;
  test?: unknown;
  complexity?: unknown;
  type?: unknown;
  evidence?: unknown;
  fix_suggestion?: unknown;
  [key: string]: unknown;
};

type Eval = {
  trajectory?: unknown;
  score?: unknown;
  fail?: unknown;
  summary?: unknown;
  task_category?: unknown;
  heart_domain?: unknown;
  dimensions?: unknown;
  rubrics?: unknown;
  tests?: unknown;
  [key: string]: unknown;
};

const SURFACED_KEYS = new Set([
  "trajectory",
  "score",
  "fail",
  "summary",
  "task_category",
  "heart_domain",
  "dimensions",
  "rubrics",
  "tests",
]);

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function getDimensions(e: Eval): Dimension[] {
  if (!Array.isArray(e.dimensions)) return [];
  return e.dimensions.filter(isObj) as Dimension[];
}

type GroupedIssues = { major: Issue[]; moderate: Issue[]; minor: Issue[] };

function groupByComplexity(items: Issue[]): GroupedIssues {
  const major: Issue[] = [];
  const moderate: Issue[] = [];
  const minor: Issue[] = [];
  for (const item of items) {
    if (item.complexity === "major") major.push(item);
    else if (item.complexity === "moderate") moderate.push(item);
    else minor.push(item);
  }
  return { major, moderate, minor };
}

function getIssues(container: unknown): Issue[] {
  if (!isObj(container)) return [];
  const issues = (container as Record<string, unknown>).issues;
  return Array.isArray(issues) ? (issues.filter(isObj) as Issue[]) : [];
}

function getCount(container: unknown, key: string): number | null {
  if (!isObj(container)) return null;
  const n = (container as Record<string, unknown>)[key];
  return typeof n === "number" ? n : null;
}

type ScoreTone = {
  pill: string;
  block: string;
  ring: string;
  fg: string;
};

function scoreTone(score: unknown, fail: unknown): ScoreTone {
  const s = typeof score === "number" ? score : NaN;
  if (fail === true || s <= 2) {
    return {
      pill: "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300",
      block: "bg-rose-500/10 border-rose-500/30",
      ring: "ring-rose-500/40",
      fg: "text-rose-700 dark:text-rose-300",
    };
  }
  if (s >= 5) {
    return {
      pill: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
      block: "bg-emerald-500/10 border-emerald-500/30",
      ring: "ring-emerald-500/40",
      fg: "text-emerald-700 dark:text-emerald-300",
    };
  }
  if (s >= 4) {
    return {
      pill: "bg-sky-500/15 text-sky-700 border-sky-500/40 dark:text-sky-300",
      block: "bg-sky-500/10 border-sky-500/30",
      ring: "ring-sky-500/40",
      fg: "text-sky-700 dark:text-sky-300",
    };
  }
  return {
    pill: "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300",
    block: "bg-amber-500/10 border-amber-500/30",
    ring: "ring-amber-500/40",
    fg: "text-amber-700 dark:text-amber-300",
  };
}

type Severity = "major" | "moderate" | "minor";

function severityTone(sev: Severity): { pill: string; block: string; label: string } {
  switch (sev) {
    case "major":
      return {
        pill: "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300",
        block: "bg-rose-500/10 border-rose-500/30",
        label: "Major",
      };
    case "moderate":
      return {
        pill: "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300",
        block: "bg-amber-500/10 border-amber-500/30",
        label: "Moderate",
      };
    case "minor":
      return {
        pill: "bg-sky-500/15 text-sky-700 border-sky-500/40 dark:text-sky-300",
        block: "bg-sky-500/10 border-sky-500/30",
        label: "Minor",
      };
  }
}

type Outcome = "fail" | "non-fail" | null;

// Holistic eval dimensions encode pass/fail in their category text, e.g.
// "[Fail – Missing Failure Annotations]" or "[Non-Fail – Minor …]".
function categoryOutcome(category: unknown): Outcome {
  if (typeof category !== "string") return null;
  const c = category.toLowerCase();
  if (c.includes("non-fail") || c.includes("non fail")) return "non-fail";
  if (c.includes("fail")) return "fail";
  return null;
}

function outcomePill(outcome: Outcome): { label: string; cls: string } | null {
  if (outcome === "fail") {
    return {
      label: "Fail",
      cls: "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300",
    };
  }
  if (outcome === "non-fail") {
    return {
      label: "Non-Fail",
      cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300",
    };
  }
  return null;
}

function trajectoryPill(t: unknown): { label: string; cls: string } {
  if (t === "golden") {
    return {
      label: "GOLDEN",
      cls: "bg-amber-500/15 text-amber-700 border-amber-500/40 dark:text-amber-300",
    };
  }
  if (t === "initial") {
    return {
      label: "INITIAL",
      cls: "bg-sky-500/15 text-sky-700 border-sky-500/40 dark:text-sky-300",
    };
  }
  return {
    label: typeof t === "string" && t ? t.toUpperCase() : "—",
    cls: "bg-ink-700/40 text-ink-300 border-ink-700",
  };
}

export function EvalViewer({
  text,
  onOpenFile,
  onOpenFileWithFocus,
  fileExists,
}: Props) {
  const parsed = parseEval(text);
  const dims = parsed.ok ? getDimensions(parsed.value) : [];
  const [selectedDim, setSelectedDim] = useState<number | null>(
    dims.length > 0 ? 0 : null,
  );

  if (!parsed.ok) {
    return <JsonViewer text={text} />;
  }

  const e = parsed.value;
  const tone = scoreTone(e.score, e.fail);
  const traj = trajectoryPill(e.trajectory);

  const rubricIssues = groupByComplexity(getIssues(e.rubrics));
  const nCriteria = getCount(e.rubrics, "n_criteria");
  const testIssues = groupByComplexity(getIssues(e.tests));
  const nTests = getCount(e.tests, "n_tests");
  const hasRubrics = isObj(e.rubrics);
  const hasTests = isObj(e.tests);

  const trajectory =
    e.trajectory === "golden" || e.trajectory === "initial"
      ? e.trajectory
      : null;
  const rubricPath = trajectory ? `${trajectory}/rubric.json` : null;
  const testPath = trajectory
    ? `${trajectory}/tests/test_outputs.py`
    : null;

  const makeOpenRubric = (
    criterionId: string,
  ): (() => void) | undefined => {
    if (!rubricPath) return undefined;
    if (fileExists && !fileExists(rubricPath)) return undefined;
    if (onOpenFileWithFocus) {
      return () => onOpenFileWithFocus(rubricPath, criterionId);
    }
    if (onOpenFile) return () => onOpenFile(rubricPath);
    return undefined;
  };

  const makeOpenTest = (): (() => void) | undefined => {
    if (!testPath || !onOpenFile) return undefined;
    if (fileExists && !fileExists(testPath)) return undefined;
    return () => onOpenFile(testPath);
  };

  const remaining = Object.entries(e).filter(([k]) => !SURFACED_KEYS.has(k));

  const selected =
    selectedDim !== null && selectedDim >= 0 && selectedDim < dims.length
      ? dims[selectedDim]
      : null;

  return (
    <div className="space-y-5">
      <Header eval={e} tone={tone} traj={traj} nCriteria={nCriteria} nTests={nTests} />

      {typeof e.summary === "string" && e.summary ? (
        <Summary text={e.summary} tone={tone} />
      ) : null}

      {dims.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle>Dimensions ({dims.length})</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
            <div className="rounded-lg border border-ink-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-ink-900/70 text-ink-400 text-[11px] uppercase tracking-wide">
                  <tr>
                    <th className="text-left font-medium px-3 py-2 w-12">#</th>
                    <th className="text-left font-medium px-3 py-2 w-16">Rating</th>
                    <th className="text-left font-medium px-3 py-2">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {dims.map((d, i) => {
                    const isSel = i === selectedDim;
                    const dTone = scoreTone(d.rating, undefined);
                    const name =
                      typeof d.name === "string" ? d.name : "(no name)";
                    const outcome = categoryOutcome(d.category);
                    return (
                      <tr
                        key={i}
                        onClick={() => setSelectedDim(i)}
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
                          D{i + 1}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center justify-center rounded-md border w-7 h-6 font-mono text-xs ${dTone.pill}`}
                          >
                            {typeof d.rating === "number"
                              ? d.rating
                              : typeof d.rating === "string"
                                ? d.rating
                                : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2 leading-snug">
                          <span className="flex items-start gap-2">
                            {outcome ? (
                              <span
                                title={outcome === "fail" ? "Fail" : "Non-Fail"}
                                className={`mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                                  outcome === "fail"
                                    ? "bg-rose-500"
                                    : "bg-emerald-500"
                                }`}
                              />
                            ) : null}
                            <span>{name}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="rounded-lg border border-ink-800 bg-ink-900/40 p-4 lg:sticky lg:top-0 lg:self-start">
              {selected && selectedDim !== null ? (
                <DimensionDetails idx={selectedDim} item={selected} />
              ) : (
                <div className="text-ink-500 text-sm">
                  Select a dimension to see details.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {hasRubrics ? (
        <IssuesSection
          title="Rubric Issues"
          nLabel={
            nCriteria !== null
              ? `${nCriteria} criteria`
              : undefined
          }
          grouped={rubricIssues}
          idKey="id"
          makeOpen={makeOpenRubric}
          targetName={rubricPath ?? undefined}
        />
      ) : null}

      {hasTests ? (
        <IssuesSection
          title="Test Issues"
          nLabel={
            nTests !== null
              ? `${nTests} test${nTests === 1 ? "" : "s"}`
              : undefined
          }
          grouped={testIssues}
          idKey="test"
          makeOpen={makeOpenTest}
          targetName={testPath ?? undefined}
        />
      ) : null}

      {remaining.length > 0 ? (
        <section className="space-y-2">
          <SectionTitle>Other</SectionTitle>
          <pre className="text-[11px] font-mono bg-ink-950/40 border border-ink-800 rounded p-3 overflow-x-auto scroll-thin">
            {JSON.stringify(Object.fromEntries(remaining), null, 2)}
          </pre>
        </section>
      ) : null}
    </div>
  );
}

function parseEval(text: string): { ok: false } | { ok: true; value: Eval } {
  try {
    const v = JSON.parse(text);
    if (!isObj(v)) return { ok: false };
    const looksLikeEval =
      "score" in v ||
      "summary" in v ||
      "dimensions" in v ||
      "trajectory" in v;
    if (!looksLikeEval) return { ok: false };
    return { ok: true, value: v as Eval };
  } catch {
    return { ok: false };
  }
}

function Header({
  eval: e,
  tone,
  traj,
  nCriteria,
  nTests,
}: {
  eval: Eval;
  tone: ScoreTone;
  traj: { label: string; cls: string };
  nCriteria: number | null;
  nTests: number | null;
}) {
  const score = typeof e.score === "number" ? e.score : null;
  const fail = e.fail === true;
  const taskCategory =
    typeof e.task_category === "string" ? e.task_category : null;
  const heartDomain =
    typeof e.heart_domain === "string" ? e.heart_domain : null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div
        className={`inline-flex items-baseline gap-2 rounded-lg border px-3 py-1.5 ${tone.block}`}
      >
        <span className="text-[10px] uppercase tracking-wide text-ink-500">
          Score
        </span>
        <span className={`font-mono text-xl leading-none ${tone.fg}`}>
          {score ?? "—"}
        </span>
        <span className="text-ink-500 text-xs">/ 5</span>
      </div>

      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
          fail
            ? "bg-rose-500/15 text-rose-700 border-rose-500/40 dark:text-rose-300"
            : "bg-emerald-500/15 text-emerald-700 border-emerald-500/40 dark:text-emerald-300"
        }`}
      >
        {fail ? "Fail" : "Pass"}
      </span>

      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${traj.cls}`}
      >
        {traj.label}
      </span>

      {taskCategory ? <Tag label="Task" value={taskCategory} /> : null}
      {heartDomain ? <Tag label="Domain" value={heartDomain} /> : null}
      {nCriteria !== null ? (
        <Tag label="Criteria" value={String(nCriteria)} />
      ) : null}
      {nTests !== null ? <Tag label="Tests" value={String(nTests)} /> : null}
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-800/50 px-2.5 py-0.5 text-[11px]">
      <span className="text-ink-500 uppercase tracking-wide text-[10px]">
        {label}
      </span>
      <span className="text-ink-200 font-mono">{value}</span>
    </span>
  );
}

function Summary({ text, tone }: { text: string; tone: ScoreTone }) {
  return (
    <div className={`rounded-lg border ${tone.block} p-4`}>
      <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
        Summary
      </div>
      <p className="text-sm text-ink-100 leading-relaxed whitespace-pre-wrap break-words">
        {text}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] uppercase tracking-wide text-ink-400 font-medium">
      {children}
    </h3>
  );
}

function DimensionDetails({ idx, item }: { idx: number; item: Dimension }) {
  const tone = scoreTone(item.rating, undefined);
  const name = typeof item.name === "string" ? item.name : "(no name)";
  const category =
    typeof item.category === "string" ? item.category : null;
  const evidence =
    typeof item.evidence === "string" ? item.evidence : null;
  const fixSuggestion =
    typeof item.fix_suggestion === "string" ? item.fix_suggestion : null;
  const outcome = outcomePill(categoryOutcome(category));

  const handled = new Set([
    "name",
    "rating",
    "category",
    "evidence",
    "fix_suggestion",
  ]);
  const rest = Object.entries(item).filter(([k]) => !handled.has(k));

  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400/80 font-mono">
            D{idx + 1}
          </span>
          <span
            className={`inline-flex items-center justify-center rounded-md border w-7 h-6 font-mono text-xs ${tone.pill}`}
          >
            {typeof item.rating === "number"
              ? item.rating
              : typeof item.rating === "string"
                ? item.rating
                : "—"}
          </span>
          {outcome ? (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${outcome.cls}`}
            >
              {outcome.label}
            </span>
          ) : null}
        </div>
        <div className="text-ink-100 mt-1 leading-snug">{name}</div>
      </div>

      {category ? (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
            Category
          </div>
          <div className={`text-xs ${tone.fg}`}>{category}</div>
        </div>
      ) : null}

      {evidence ? (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
            Evidence
          </div>
          <div
            className={`rounded border ${tone.block} p-3 text-xs text-ink-200 leading-relaxed whitespace-pre-wrap break-words`}
          >
            {evidence}
          </div>
        </div>
      ) : null}

      {fixSuggestion ? (
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ink-500 mb-1.5">
            Fix suggestion
          </div>
          <div className="rounded border border-sky-500/30 bg-sky-500/10 p-3 text-xs text-ink-200 leading-relaxed whitespace-pre-wrap break-words">
            {fixSuggestion}
          </div>
        </div>
      ) : null}

      {rest.length > 0 ? (
        <pre className="text-[11px] font-mono bg-ink-950/40 border border-ink-800 rounded p-2 overflow-x-auto scroll-thin">
          {JSON.stringify(Object.fromEntries(rest), null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

function IssuesSection({
  title,
  nLabel,
  grouped,
  idKey,
  makeOpen,
  targetName,
}: {
  title: string;
  nLabel?: string;
  grouped: GroupedIssues;
  idKey: "id" | "test";
  makeOpen?: (idValue: string) => (() => void) | undefined;
  targetName?: string;
}) {
  const total =
    grouped.major.length + grouped.moderate.length + grouped.minor.length;

  return (
    <section className="space-y-3">
      <SectionTitle>
        {title}
        <span className="ml-2 text-ink-500 font-normal normal-case tracking-normal">
          {nLabel ? `${nLabel} · ` : ""}
          {grouped.major.length} major · {grouped.moderate.length} moderate ·{" "}
          {grouped.minor.length} minor
        </span>
      </SectionTitle>

      {total === 0 ? (
        <div className="text-xs text-ink-500">No issues to report.</div>
      ) : (
        <div className="space-y-3">
          {grouped.major.map((iss, i) => (
            <IssueCard
              key={`maj-${i}`}
              severity="major"
              item={iss}
              idKey={idKey}
              makeOpen={makeOpen}
              targetName={targetName}
            />
          ))}
          {grouped.moderate.map((iss, i) => (
            <IssueCard
              key={`mod-${i}`}
              severity="moderate"
              item={iss}
              idKey={idKey}
              makeOpen={makeOpen}
              targetName={targetName}
            />
          ))}
          {grouped.minor.map((iss, i) => (
            <IssueCard
              key={`min-${i}`}
              severity="minor"
              item={iss}
              idKey={idKey}
              makeOpen={makeOpen}
              targetName={targetName}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function IssueCard({
  severity,
  item,
  idKey,
  makeOpen,
  targetName,
}: {
  severity: Severity;
  item: Issue;
  idKey: "id" | "test";
  makeOpen?: (idValue: string) => (() => void) | undefined;
  targetName?: string;
}) {
  const tone = severityTone(severity);
  const idValue =
    typeof item[idKey] === "string" ? (item[idKey] as string) : null;
  const onOpenTarget = idValue && makeOpen ? makeOpen(idValue) : undefined;
  const type = typeof item.type === "string" ? item.type : null;
  const evidence =
    typeof item.evidence === "string" ? item.evidence : null;
  const fixSuggestion =
    typeof item.fix_suggestion === "string" ? item.fix_suggestion : null;

  const handled = new Set([idKey, "complexity", "type", "evidence", "fix_suggestion"]);
  const rest = Object.entries(item).filter(([k]) => !handled.has(k));

  return (
    <div className={`rounded-lg border ${tone.block} p-3 space-y-2`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tone.pill}`}
        >
          {tone.label}
        </span>
        {type ? (
          <span className="text-[11px] text-ink-300 font-mono">{type}</span>
        ) : null}
        {idValue ? (
          onOpenTarget ? (
            <button
              type="button"
              onClick={onOpenTarget}
              title={targetName ? `Open ${targetName}` : undefined}
              className="ml-auto text-[10px] font-mono text-sky-600 hover:text-sky-500 dark:text-sky-400 dark:hover:text-sky-300 underline underline-offset-2 break-all"
            >
              {idValue}
            </button>
          ) : (
            <span className="ml-auto text-[10px] font-mono text-ink-500 break-all">
              {idValue}
            </span>
          )
        ) : null}
      </div>
      {evidence ? (
        <div className="text-xs text-ink-200 leading-relaxed whitespace-pre-wrap break-words">
          {evidence}
        </div>
      ) : null}
      {fixSuggestion ? (
        <div className="rounded border border-sky-500/30 bg-sky-500/10 p-2.5 text-xs text-ink-200 leading-relaxed whitespace-pre-wrap break-words">
          <div className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1">
            Fix suggestion
          </div>
          {fixSuggestion}
        </div>
      ) : null}
      {rest.length > 0 ? (
        <pre className="text-[11px] font-mono bg-ink-950/40 border border-ink-800 rounded p-2 overflow-x-auto scroll-thin">
          {JSON.stringify(Object.fromEntries(rest), null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
