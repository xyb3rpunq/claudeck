// Endpoint kesehatan untuk monitoring deployment (uptime check, load balancer).
// Sengaja tidak membocorkan detail konfigurasi apa pun selain status siap/tidak.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

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
  } catch (err) {
    // Response-nya sengaja tidak memuat detail error (bisa membocorkan
    // connection string), tapi tanpa jejak di log operator tidak punya apa pun
    // untuk didiagnosis.
    checks.database = false;
    logger.error("health_database_failed", { message: (err as Error).message });
  }

  const healthy = checks.database;
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
