import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeWebReadableStream } from "node:stream/web";
import type { AttemptSummary, FileContent, FileNode } from "@/lib/types";
import { guessContentType } from "@/lib/content-type";
import type { StorageBackend } from "./index";

const IGNORED = new Set([".DS_Store", "Thumbs.db"]);

function storageRoot(): string {
  const configured = process.env.LOCAL_STORAGE_ROOT ?? "./storage";
  return path.resolve(process.cwd(), configured);
}

function attemptsRoot(): string {
  return path.join(storageRoot(), "attempts");
}

async function safeStat(p: string) {
  try {
    return await fs.stat(p);
  } catch {
    return null;
  }
}

async function walk(dirAbs: string, relBase = ""): Promise<FileNode> {
  const name = relBase === "" ? path.basename(dirAbs) : path.basename(dirAbs);
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  const children: FileNode[] = [];
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    if (entry.name.startsWith("._")) continue;
    const absChild = path.join(dirAbs, entry.name);
    const relChild = relBase === "" ? entry.name : `${relBase}/${entry.name}`;
    if (entry.isDirectory()) {
      children.push(await walk(absChild, relChild));
    } else if (entry.isFile()) {
      const stat = await fs.stat(absChild);
      children.push({
        kind: "file",
        name: entry.name,
        path: relChild,
        size: stat.size,
        contentType: guessContentType(entry.name),
      });
    }
  }
  children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return { kind: "dir", name, path: relBase, children };
}

function totalsFromTree(node: FileNode): { files: number; bytes: number } {
  if (node.kind === "file") return { files: 1, bytes: node.size };
  let files = 0;
  let bytes = 0;
  for (const c of node.children) {
    const sub = totalsFromTree(c);
    files += sub.files;
    bytes += sub.bytes;
  }
  return { files, bytes };
}

function isSafeRelative(relPath: string): boolean {
  if (!relPath) return false;
  if (relPath.includes("..")) return false;
  if (path.isAbsolute(relPath)) return false;
  return true;
}

export const fsBackend: StorageBackend = {
  async listAttempts(): Promise<AttemptSummary[]> {
    const root = attemptsRoot();
    const stat = await safeStat(root);
    if (!stat || !stat.isDirectory()) return [];
    const entries = await fs.readdir(root, { withFileTypes: true });
    const attempts: AttemptSummary[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const abs = path.join(root, entry.name);
      const tree = await walk(abs);
      const totals = totalsFromTree(tree);
      const dirStat = await fs.stat(abs);
      let instructionPreview: string | undefined;
      const instructionPath = path.join(abs, "instruction.md");
      const instructionStat = await safeStat(instructionPath);
      if (instructionStat?.isFile()) {
        const txt = await fs.readFile(instructionPath, "utf8");
        instructionPreview = txt.slice(0, 280);
      }
      attempts.push({
        id: entry.name,
        fileCount: totals.files,
        totalBytes: totals.bytes,
        updatedAt: dirStat.mtime.toISOString(),
        instructionPreview,
      });
    }
    attempts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return attempts;
  },

  async getAttemptTree(attemptId: string): Promise<FileNode | null> {
    if (!isSafeRelative(attemptId)) return null;
    const abs = path.join(attemptsRoot(), attemptId);
    const stat = await safeStat(abs);
    if (!stat?.isDirectory()) return null;
    return walk(abs);
  },

  async getFile(attemptId: string, relPath: string): Promise<FileContent | null> {
    if (!isSafeRelative(attemptId)) return null;
    if (!isSafeRelative(relPath)) return null;
    const abs = path.join(attemptsRoot(), attemptId, relPath);
    const stat = await safeStat(abs);
    if (!stat?.isFile()) return null;
    const nodeStream = createReadStream(abs);
    const webStream = Readable.toWeb(nodeStream) as NodeWebReadableStream<Uint8Array>;
    return {
      path: relPath,
      size: stat.size,
      contentType: guessContentType(path.basename(relPath)),
      body: webStream as unknown as ReadableStream<Uint8Array>,
    };
  },
};
