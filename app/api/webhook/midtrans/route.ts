// STEP 5.2 — Webhook notifikasi pembayaran Midtrans.
// Verifikasi signature, update status Transaction, tambah creditBalance jika success.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyMidtransSignature } from "@/lib/midtrans";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  if (
    !payload ||
    typeof payload.order_id !== "string" ||
    typeof payload.status_code !== "string" ||
    typeof payload.gross_amount !== "string" ||
    typeof payload.signature_key !== "string" ||
    typeof payload.transaction_status !== "string"
  ) {
    return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
  }

  // Verifikasi signature: sha512(order_id + status_code + gross_amount + server_key)
  if (!verifyMidtransSignature(payload)) {
    logger.warn("midtrans_invalid_signature", { orderId: payload.order_id });
    return NextResponse.json({ error: "Signature tidak valid" }, { status: 403 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { paymentRef: payload.order_id },
  });
  if (!transaction) {
    logger.warn("midtrans_unknown_order", { orderId: payload.order_id });
    return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
  }

  const txStatus: string = payload.transaction_status;
  const fraudStatus: string | undefined = payload.fraud_status;

  let newStatus: "pending" | "success" | "failed" = "pending";
  if (
    (txStatus === "capture" && fraudStatus === "accept") ||
    txStatus === "settlement"
  ) {
    newStatus = "success";
  } else if (["deny", "cancel", "expire", "failure"].includes(txStatus)) {
    newStatus = "failed";
  }

  // Idempotent: jangan proses ulang transaksi yang sudah final
  if (transaction.status === "success") {
    return NextResponse.json({ ok: true });
  }

  if (newStatus === "success") {
    // Update status + tambah saldo secara atomik
    await prisma.$transaction([
      prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "success" },
      }),
      prisma.user.update({
        where: { id: transaction.userId },
        data: { creditBalance: { increment: transaction.creditsAdded } },
      }),
    ]);
    logger.info("topup_success", {
      userId: transaction.userId,
      orderId: payload.order_id,
      creditsAdded: transaction.creditsAdded,
    });
  } else if (newStatus === "failed") {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "failed" },
    });
    logger.info("topup_failed_status", {
      orderId: payload.order_id,
      txStatus,
    });
  }

  return NextResponse.json({ ok: true });
}
