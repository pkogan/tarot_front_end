import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const url = new URL(req.url);
  const filePath = url.searchParams.get("path");
  if (!filePath) {
    return new Response("missing 'path' query param", { status: 400 });
  }

  const file = await storage.getFile(params.id, filePath);
  if (!file) return new Response("not found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", file.contentType);
  headers.set("Content-Length", String(file.size));
  headers.set("Cache-Control", "private, max-age=60");

  const body = file.body as ReadableStream<Uint8Array>;
  return new Response(body, { headers });
}
