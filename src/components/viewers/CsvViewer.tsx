"use client";

import { useMemo } from "react";
import Papa from "papaparse";

export function CsvViewer({ text, delimiter }: { text: string; delimiter?: string }) {
  const { headers, rows, error } = useMemo(() => {
    const parsed = Papa.parse<string[]>(text, {
      delimiter: delimiter ?? "",
      skipEmptyLines: true,
    });
    if (parsed.errors.length > 0) {
      return { headers: [], rows: [], error: parsed.errors[0].message };
    }
    const data = parsed.data as string[][];
    const headers = data[0] ?? [];
    const rows = data.slice(1, 1001);
    return { headers, rows, error: null };
  }, [text, delimiter]);

  if (error)
    return (
      <div className="text-rose-700 dark:text-rose-300 text-sm">
        CSV error: {error}
      </div>
    );

  return (
    <div className="overflow-auto scroll-thin border border-ink-800 rounded-lg">
      <table className="min-w-full text-xs font-mono">
        <thead className="bg-ink-900 sticky top-0">
          <tr>
            <th className="text-left px-3 py-2 text-ink-500 font-normal w-10">#</th>
            {headers.map((h, i) => (
              <th
                key={i}
                className="text-left px-3 py-2 text-ink-200 font-medium border-l border-ink-800"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="odd:bg-ink-950 even:bg-ink-900/40">
              <td className="px-3 py-1.5 text-ink-500 tabular-nums">{ri + 1}</td>
              {headers.map((_, ci) => (
                <td key={ci} className="px-3 py-1.5 text-ink-200 border-l border-ink-800/60">
                  {row[ci] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length >= 1000 && (
        <div className="text-[11px] text-ink-500 px-3 py-2 border-t border-ink-800">
          Showing first 1000 rows.
        </div>
      )}
    </div>
  );
}
