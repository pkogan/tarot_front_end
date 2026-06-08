/**
 * Batch ingestion: walk ./storage/attempts/<id>/** and upload every file to
 * Vercel Blob, then write a manifest per attempt so the viewer can list and
 * render the tree without doing a full bucket scan on every request.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... npx tsx scripts/ingest.ts
 *   # optional: limit to specific attempts
 *   npx tsx scripts/ingest.ts 6a147b8ffb80b0232920509d
 */
import { promises as fs, createReadStream } from "node:fs";
import path from "node:path";
import { put, head } from "@vercel/blob";
import { guessContentType } from "../src/lib/content-type";
import type { AttemptManifest } from "../src/lib/types";

const IGNORED = new Set([".DS_Store", "Thumbs.db"]);
const ATTEMPTS_PREFIX = "attempts/";
const MANIFEST_PREFIX = "manifests/";

type FileEntry = { abs: string; rel: string; size: number };

async function walk(dirAbs: string, relBase = ""): Promise<FileEntry[]> {
  const entries = await fs.readdir(dirAbs, { withFileTypes: true });
  const out: FileEntry[] = [];
  for (const entry of entries) {
    if (IGNORED.has(entry.name)) continue;
    if (entry.name.startsWith("._")) continue;
    const abs = path.join(dirAbs, entry.name);
    const rel = relBase === "" ? entry.name : `${relBase}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...(await walk(abs, rel)));
    } else if (entry.isFile()) {
      const stat = await fs.stat(abs);
      out.push({ abs, rel, size: stat.size });
    }
  }
  return out;
}

async function ingestAttempt(
  rootAbs: string,
  attemptId: string,
): Promise<{ files: number; bytes: number }> {
  const attemptAbs = path.join(rootAbs, attemptId);
  const files = await walk(attemptAbs);
  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  console.log(
    `\n=== ${attemptId} : ${files.length} files, ${(totalBytes / 1024 / 1024).toFixed(2)} MB ===`,
  );

  const manifest: AttemptManifest = {
    id: attemptId,
    files: [],
    updatedAt: new Date().toISOString(),
  };

  for (const file of files) {
    const contentType = guessContentType(file.rel);
    const key = `${ATTEMPTS_PREFIX}${attemptId}/${file.rel}`;

    let existed = false;
    try {
      const meta = await head(key);
      if (meta && meta.size === file.size) {
        existed = true;
      }
    } catch {
      // head throws when the blob doesn't exist; fall through to upload
    }

    if (existed) {
      process.stdout.write(`  skipping ${file.rel} (${file.size}B, exists)\n`);
    } else {
      const body = createReadStream(file.abs);
      process.stdout.write(`  uploading ${file.rel} (${file.size}B)... `);
      await put(key, body, {
        access: "public",
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      process.stdout.write("ok\n");
    }

    manifest.files.push({
      path: file.rel,
      size: file.size,
      contentType,
      updatedAt: manifest.updatedAt,
    });
  }

  const manifestKey = `${MANIFEST_PREFIX}${attemptId}.json`;
  await put(manifestKey, JSON.stringify(manifest, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  console.log(`  manifest -> ${manifestKey}`);
  return { files: files.length, bytes: totalBytes };
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error(
      "BLOB_READ_WRITE_TOKEN is not set.\n" +
        "Pull it from Vercel:\n" +
        "  vercel link            # one-time\n" +
        "  vercel env pull .env.local\n",
    );
    process.exit(1);
  }
  const localRoot = process.env.LOCAL_STORAGE_ROOT ?? "./storage";
  const rootAbs = path.resolve(process.cwd(), localRoot, "attempts");
  const stat = await fs.stat(rootAbs).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    console.error(`No attempts folder found at ${rootAbs}`);
    process.exit(1);
  }

  const filterIds = process.argv.slice(2);
  const all = (await fs.readdir(rootAbs, { withFileTypes: true }))
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const targets =
    filterIds.length > 0 ? all.filter((id) => filterIds.includes(id)) : all;

  if (targets.length === 0) {
    console.error("No matching attempts to ingest.");
    process.exit(1);
  }

  console.log(
    `Ingesting ${targets.length} attempt(s) into Vercel Blob from ${rootAbs}...`,
  );
  const started = Date.now();
  let totalFiles = 0;
  let totalBytes = 0;
  for (const id of targets) {
    const { files, bytes } = await ingestAttempt(rootAbs, id);
    totalFiles += files;
    totalBytes += bytes;
  }
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `\nDone. Uploaded ${totalFiles} files (${(totalBytes / 1024 / 1024).toFixed(
      2,
    )} MB) in ${elapsed}s.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
