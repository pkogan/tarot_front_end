# Attempt Viewer (Next.js + Vercel Blob)

An example "app viewer" that lists attempts (a.k.a. tasks) and lets you browse
every file inside an attempt folder with smart, per-type previews:

- `.md` — rendered Markdown (with GFM tables, links, lists)
- `.json` — collapsible tree + raw view
- `.csv` / `.tsv` — rendered as a sticky-header table (first 1000 rows)
- `.txt` / `.py` / `.log` / … — syntax-friendly plain text
- images, audio, video, PDF — inline preview using the browser
- everything else — metadata + download link

## Storage architecture

Vercel functions have an ephemeral filesystem, so the source of truth lives
**outside** the deployment. This project uses two interchangeable backends:

| Backend | When to use | How files are addressed |
|---|---|---|
| `fs`   | Local development & demos. Reads from `./storage/attempts/<id>/` | filesystem path |
| `blob` | Production on Vercel | `attempts/<id>/<relative/path>` in [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) + a `manifests/<id>.json` index |

Switch with the `STORAGE_BACKEND` env var.

### Why a per-attempt manifest?

Listing every object on every page load gets slow and expensive once you have
many attempts. The ingestion script writes a small `manifests/<id>.json` file
that contains the full tree (paths, sizes, MIME types). The viewer reads the
manifest to render the tree, and only fetches the actual file bytes when you
click into one.

For a heavier-duty setup, swap manifests for **Vercel Postgres / Neon** with a
`files` table. The API surface stays the same — only `src/lib/storage/` changes.

## Run locally against the included example folder

The repo already ships with an example attempt at
`storage/attempts/6a147b8ffb80b0232920509d/`. No external service needed:

```bash
npm install
cp .env.local.example .env.local   # STORAGE_BACKEND=fs is the default
npm run dev
# open http://localhost:3000
```

## Deploy to Vercel with Blob storage

1. Create a Vercel project and connect a **Blob** store (Storage tab → Create).
   That populates `BLOB_READ_WRITE_TOKEN` automatically.
2. Set environment variables:
   ```
   STORAGE_BACKEND=blob
   BLOB_READ_WRITE_TOKEN=...   # set automatically by the integration
   ```
3. Run the ingestion script **from your machine or a CI job** (not from a
   serverless function — your batch jobs are usually too big for a 60s limit):
   ```bash
   BLOB_READ_WRITE_TOKEN=... npm run ingest
   # or limit to one attempt
   BLOB_READ_WRITE_TOKEN=... npm run ingest 6a147b8ffb80b0232920509d
   ```
4. Deploy. The same app code now serves files from Blob.

### Where the batch job belongs in production

The included `scripts/ingest.ts` is the reference implementation. To run it
on a schedule with retries, wire it into one of:

- **GitHub Actions** (cron + repo secret) — simplest
- **Vercel Cron + a long-running Function** (`maxDuration` up to 300s on Fluid)
- **Inngest / Trigger.dev / Temporal** — for true durability and observability
- A tiny **Fly.io / Railway / Render** worker that watches your data source

The API route `/api/ingest` is a hook you can call from any of those to kick
off a run (protected by `INGEST_SECRET`).

## Project layout

```text
src/
  app/
    page.tsx                       # attempts index
    attempts/[id]/page.tsx         # viewer (tree + content)
    api/
      attempts/route.ts            # GET attempts list
      attempts/[id]/tree/route.ts  # GET attempt tree
      attempts/[id]/file/route.ts  # GET ?path=... streams file bytes
      ingest/route.ts              # POST trigger hook
  components/
    AttemptBrowser.tsx             # tree + content layout
    FileTree.tsx                   # collapsible sidebar
    FileViewer.tsx                 # routes by MIME type
    viewers/                       # markdown, json, csv, media, fallback
  lib/
    storage/
      index.ts                     # backend selector
      fs-backend.ts                # ./storage/* implementation
      blob-backend.ts              # Vercel Blob implementation
    content-type.ts                # MIME + category helpers
    format.ts                      # bytes/relative-time
    types.ts                       # shared types
scripts/
  ingest.ts                        # walks storage/attempts and uploads to Blob
storage/
  attempts/<id>/...                # source of truth in local mode
```

## Notes & next steps

- Files larger than ~2 MB skip the inline text/JSON/CSV preview and offer a
  download button instead. Tune `TEXT_MAX_BYTES` in `FileViewer.tsx` if you want.
- All file requests go through `/api/attempts/[id]/file` so authorization can be
  added in one place (cookies, basic auth, SSO, etc.).
- Blob URLs are public by default. For private content, switch the ingestion to
  `access: 'public'` only for the manifest and use signed URLs for the files.
