import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Placeholder hook for a managed ingestion run. In production you would call a
 * background worker (Inngest, Trigger.dev, GitHub Actions, a Fly box, etc.) from
 * here. Doing the upload inline in a serverless function is not recommended for
 * large folders because of execution-time and memory limits.
 */
export async function POST(req: Request) {
  const secret = process.env.INGEST_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  return NextResponse.json({
    ok: true,
    message:
      "Trigger your batch ingestion worker here. For the demo, run `npm run ingest` locally.",
  });
}
