import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const tree = await storage.getAttemptTree(params.id);
  if (!tree) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ tree });
}
