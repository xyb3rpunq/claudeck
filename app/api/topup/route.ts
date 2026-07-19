// STEP 5.1 — Generate Midtrans Snap token untuk top-up saldo.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSnapTransaction } from "@/lib/midtrans";
import { convertRupiahToCredit, TOPUP_PACKAGES } from "@/lib/pricing";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const topupSchema = z.object({
  packageId: z.enum(
    TOPUP_PACKAGES.map((p) => p.id) as [string, ...string[]]
  ),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = topupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paket tidak valid" }, { status: 400 });
  }

  const pkg = TOPUP_PACKAGES.find((p) => p.id === parsed.data.packageId)!;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orderId = `claudeck-${userId.slice(-8)}-${Date.now()}`;

  try {
    // Buat record transaksi pending lebih dulu
    await prisma.transaction.create({
      data: {
        userId,
        amountRp: pkg.amountRp,
        creditsAdded: convertRupiahToCredit(pkg.amountRp),
        paymentRef: orderId,
        status: "pending",
      },
    });

    const snap = await createSnapTransaction({
      orderId,
      grossAmount: pkg.amountRp,
      customerEmail: user.email,
    });

    logger.info("topup_initiated", { userId, orderId, amountRp: pkg.amountRp });
    return NextResponse.json({
      token: snap.token,
      redirectUrl: snap.redirect_url,
      orderId,
    });
  } catch (err) {
    logger.error("topup_failed", { userId, orderId, message: (err as Error).message });
    return NextResponse.json(
      { error: "Gagal membuat transaksi pembayaran. Coba lagi nanti." },
      { status: 502 }
    );
  }
}
