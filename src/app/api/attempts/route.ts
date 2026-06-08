import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET() {
  const attempts = await storage.listAttempts();
  return NextResponse.json({ attempts });
}
