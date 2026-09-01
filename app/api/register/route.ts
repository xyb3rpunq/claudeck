import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRegisterRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const registerSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").max(100),
});

/** IP pemanggil, mengikuti header proxy yang dipasang Vercel/reverse proxy. */
function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  try {
    // Batasi pembuatan akun per IP supaya tidak bisa dibanjiri script.
    const ip = clientIp(req);
    const rl = checkRegisterRateLimit(ip);
    if (!rl.allowed) {
      logger.warn("register_rate_limited", { ip });
      return NextResponse.json(
        { error: "Terlalu banyak pendaftaran dari jaringan ini. Coba lagi nanti." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash },
    });

    logger.info("user_registered", { userId: user.id });
    return NextResponse.json({ ok: true, userId: user.id }, { status: 201 });
  } catch (err) {
    logger.error("register_failed", { message: (err as Error).message });
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
