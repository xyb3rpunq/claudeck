// STEP 5 — Integrasi Midtrans Snap via REST API (tanpa SDK tambahan).
import crypto from "crypto";

const IS_PRODUCTION = process.env.MIDTRANS_IS_PRODUCTION === "true";

export const SNAP_BASE_URL = IS_PRODUCTION
  ? "https://app.midtrans.com"
  : "https://app.sandbox.midtrans.com";

export const SNAP_JS_URL = `${SNAP_BASE_URL}/snap/snap.js`;

export async function createSnapTransaction(params: {
  orderId: string;
  grossAmount: number;
  customerEmail: string;
}): Promise<{ token: string; redirect_url: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) {
    throw new Error("MIDTRANS_SERVER_KEY belum di-set di environment");
  }

  const res = await fetch(`${SNAP_BASE_URL}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: { email: params.customerEmail },
      credit_card: { secure: true },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Midtrans Snap error ${res.status}: ${body}`);
  }

  return res.json();
}

/**
 * Verifikasi signature notifikasi Midtrans:
 * sha512(order_id + status_code + gross_amount + server_key)
 */
export function verifyMidtransSignature(payload: {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
}): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;

  // Tanpa server key, tanda tangan tidak punya rahasia apa pun: algoritmanya
  // publik, jadi siapa saja bisa menghitung sha512(order + status + jumlah + "")
  // dan mengaku pembayarannya lunas. Instalasi yang belum dikonfigurasi harus
  // menolak semua notifikasi, bukan menerima semuanya.
  if (!serverKey) return false;

  const expected = crypto
    .createHash("sha512")
    .update(payload.order_id + payload.status_code + payload.gross_amount + serverKey)
    .digest("hex");

  // Bandingkan dengan waktu tetap supaya tidak bocor lewat timing.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(payload.signature_key, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
