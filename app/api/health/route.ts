// Endpoint kesehatan untuk monitoring deployment (uptime check, load balancer).
// Sengaja tidak membocorkan detail konfigurasi apa pun selain status siap/tidak.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    database: false,
    anthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    midtransKey: Boolean(process.env.MIDTRANS_SERVER_KEY),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    checks.database = false;
  }

  const healthy = checks.database;
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
