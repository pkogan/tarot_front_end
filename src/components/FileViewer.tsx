"use client";

import { useEffect, useState } from "react";
import { categorize, detectCodeLanguage } from "@/lib/content-type";
import { formatBytes } from "@/lib/format";
import type { FileNode } from "@/lib/types";
import { MarkdownViewer } from "./viewers/MarkdownViewer";
import { JsonViewer } from "./viewers/JsonViewer";
import { CsvViewer } from "./viewers/CsvViewer";
import { TextViewer } from "./viewers/TextViewer";
import { CodeViewer } from "./viewers/CodeViewer";
import { HallucinationsViewer } from "./viewers/HallucinationsViewer";
import { RubricViewer } from "./viewers/RubricViewer";
import { TestWeightsViewer } from "./viewers/TestWeightsViewer";
import { TrajectoryViewer } from "./viewers/TrajectoryViewer";
import { EvalViewer } from "./viewers/EvalViewer";

const TRAJECTORY_FILENAME = /^Model_[A-Za-z0-9]+\.json$/;
const TEST_WEIGHTS_FILENAME = /^test_weights?\.json$/;
const EVAL_FILENAME = /^eval_.*\.json$/;

function isInEvalsFolder(path: string): boolean {
  return path.split("/").includes("evals");
}
import {
  AudioViewer,
  ImageViewer,
  PdfViewer,
  VideoViewer,
} from "./viewers/MediaViewers";
import { FallbackViewer } from "./viewers/FallbackViewer";

const TEXT_MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  attemptId: string;
  file: Extract<FileNode, { kind: "file" }>;
  onOpenFile?: (path: string) => void;
  onOpenFileWithFocus?: (path: string, criterionId: string) => void;
  fileExists?: (path: string) => boolean;
  focusId?: string;
  focusToken?: number;
};

export function FileViewer({
  attemptId,
  file,
  onOpenFile,
  onOpenFileWithFocus,
  fileExists,
  focusId,
  focusToken,
}: Props) {
  const category = categorize(file.contentType, file.name);
  const src = `/api/attempts/${encodeURIComponent(attemptId)}/file?path=${encodeURIComponent(
    file.path,
  )}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-ink-100 font-medium truncate">{file.name}</div>
          <div className="text-xs text-ink-500 font-mono truncate">
            {file.path}
          </div>
        </div>
        <div className="text-xs text-ink-500 shrink-0 flex items-center gap-3">
          <span>{file.contentType}</span>
          <span className="w-1 h-1 rounded-full bg-ink-700" />
          <span>{formatBytes(file.size)}</span>
          <a
            href={src}
            download={file.name}
            className="text-ink-300 hover:text-white underline underline-offset-4"
          >
            download
          </a>
        </div>
      </div>

      <ViewerBody
        attemptId={attemptId}
        file={file}
        category={category}
        src={src}
        onOpenFile={onOpenFile}
        onOpenFileWithFocus={onOpenFileWithFocus}
        fileExists={fileExists}
        focusId={focusId}
        focusToken={focusToken}
      />
    </div>
  );
}

function ViewerBody({
  file,
  category,
  src,
  onOpenFile,
  onOpenFileWithFocus,
  fileExists,
  focusId,
  focusToken,
}: {
  attemptId: string;
  file: Extract<FileNode, { kind: "file" }>;
  category: ReturnType<typeof categorize>;
  src: string;
  onOpenFile?: (path: string) => void;
  onOpenFileWithFocus?: (path: string, criterionId: string) => void;
  fileExists?: (path: string) => boolean;
  focusId?: string;
  focusToken?: number;
}) {
  switch (category) {
    case "image":
      return <ImageViewer src={src} alt={file.name} />;
    case "audio":
      return <AudioViewer src={src} />;
    case "video":
      return <VideoViewer src={src} />;
    case "pdf":
      return <PdfViewer src={src} />;
    case "archive":
    case "binary":
      return (
        <FallbackViewer
          src={src}
          name={file.name}
          size={file.size}
          contentType={file.contentType}
        />
      );
    case "markdown":
    case "json":
    case "csv":
    case "code":
    case "text": {
      const effectiveCategory: TextLikeCategory =
        category === "json" && file.name === "rubric.json"
          ? "rubric"
          : category === "json" && file.name === "hallucinations.json"
            ? "hallucinations"
            : category === "json" && TEST_WEIGHTS_FILENAME.test(file.name)
              ? "test-weights"
              : category === "json" && TRAJECTORY_FILENAME.test(file.name)
                ? "trajectory"
                : category === "json" &&
                    EVAL_FILENAME.test(file.name) &&
                    isInEvalsFolder(file.path)
                  ? "eval"
                  : category;
      return (
        <TextLikeViewer
          src={src}
          file={file}
          category={effectiveCategory}
          onOpenFile={onOpenFile}
          onOpenFileWithFocus={onOpenFileWithFocus}
          fileExists={fileExists}
          focusId={focusId}
          focusToken={focusToken}
        />
      );
    }
    default:
      return (
        <FallbackViewer
          src={src}
          name={file.name}
          size={file.size}
          contentType={file.contentType}
        />
      );
  }
}

type TextLikeCategory =
  | "markdown"
  | "json"
  | "csv"
  | "code"
  | "text"
  | "rubric"
  | "hallucinations"
  | "test-weights"
  | "trajectory"
  | "eval";

function TextLikeViewer({
  src,
  file,
  category,
  onOpenFile,
  onOpenFileWithFocus,
  fileExists,
  focusId,
  focusToken,
}: {
  src: string;
  file: Extract<FileNode, { kind: "file" }>;
  category: TextLikeCategory;
  onOpenFile?: (path: string) => void;
  onOpenFileWithFocus?: (path: string, criterionId: string) => void;
  fileExists?: (path: string) => boolean;
  focusId?: string;
  focusToken?: number;
}) {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "loaded"; text: string }
    | { phase: "too-large" }
    | { phase: "error"; message: string }
  >({ phase: "loading" });

  useEffect(() => {
    let cancelled = false;
    if (file.size > TEXT_MAX_BYTES) {
      setState({ phase: "too-large" });
      return;
    }
    setState({ phase: "loading" });
    fetch(src)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((text) => {
        if (!cancelled) setState({ phase: "loaded", text });
      })
      .catch((err) => {
        if (!cancelled) setState({ phase: "error", message: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [src, file.size]);

  if (state.phase === "loading") {
    return (
      <div className="h-40 rounded-lg border border-ink-800 bg-ink-900/40 animate-pulse" />
    );
  }
  if (state.phase === "too-large") {
    return (
      <FallbackViewer
        src={src}
        name={file.name}
        size={file.size}
        contentType={file.contentType}
      />
    );
  }
  if (state.phase === "error") {
    return (
      <div className="text-rose-700 dark:text-rose-300 text-sm">
        Failed to load file: {state.message}
      </div>
    );
  }

  switch (category) {
    case "markdown":
      return <MarkdownViewer text={state.text} />;
    case "json":
      return <JsonViewer text={state.text} />;
    case "rubric":
      return (
        <RubricViewer
          text={state.text}
          focusId={focusId}
          focusToken={focusToken}
        />
      );
    case "hallucinations":
      return <HallucinationsViewer text={state.text} />;
    case "test-weights":
      return <TestWeightsViewer text={state.text} />;
    case "trajectory":
      return <TrajectoryViewer text={state.text} />;
    case "eval":
      return (
        <EvalViewer
          text={state.text}
          onOpenFile={onOpenFile}
          onOpenFileWithFocus={onOpenFileWithFocus}
          fileExists={fileExists}
        />
      );
    case "csv":
      return (
        <CsvViewer
          text={state.text}
          delimiter={file.name.endsWith(".tsv") ? "\t" : undefined}
        />
      );
    case "code": {
      const language = detectCodeLanguage(file.name);
      if (!language) return <TextViewer text={state.text} />;
      return <CodeViewer text={state.text} language={language} />;
    }
    case "text":
      return <TextViewer text={state.text} />;
  }
}
