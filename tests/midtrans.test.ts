import { afterEach, beforeEach, describe, expect, it } from "vitest";
import crypto from "node:crypto";
import { verifyMidtransSignature } from "@/lib/midtrans";

const SERVER_KEY = "SB-Mid-server-TESTKEY123";

function sign(orderId: string, statusCode: string, grossAmount: string, key = SERVER_KEY) {
  return crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + key)
    .digest("hex");
}

beforeEach(() => {
  process.env.MIDTRANS_SERVER_KEY = SERVER_KEY;
});

afterEach(() => {
  delete process.env.MIDTRANS_SERVER_KEY;
});

describe("verifyMidtransSignature", () => {
  const base = {
    order_id: "claudeck-abc12345-1700000000000",
    status_code: "200",
    gross_amount: "50000.00",
  };

  it("menerima signature yang benar", () => {
    expect(
      verifyMidtransSignature({
        ...base,
        signature_key: sign(base.order_id, base.status_code, base.gross_amount),
      })
    ).toBe(true);
  });

  it("menolak signature yang dipalsukan", () => {
    expect(
      verifyMidtransSignature({ ...base, signature_key: "a".repeat(128) })
    ).toBe(false);
  });

  it("menolak saat nominal diubah — inilah serangan yang dicegah", () => {
    const signed = sign(base.order_id, base.status_code, base.gross_amount);
    expect(
      verifyMidtransSignature({ ...base, gross_amount: "5000000.00", signature_key: signed })
    ).toBe(false);
  });

  it("menolak saat order_id diubah", () => {
    const signed = sign(base.order_id, base.status_code, base.gross_amount);
    expect(
      verifyMidtransSignature({ ...base, order_id: "claudeck-lain-123", signature_key: signed })
    ).toBe(false);
  });

  it("menolak signature yang dibuat dengan server key lain", () => {
    expect(
      verifyMidtransSignature({
        ...base,
        signature_key: sign(base.order_id, base.status_code, base.gross_amount, "kunci-penyerang"),
      })
    ).toBe(false);
  });

  it("menolak semuanya saat server key belum di-set", () => {
    const signed = sign(base.order_id, base.status_code, base.gross_amount);
    delete process.env.MIDTRANS_SERVER_KEY;
    expect(verifyMidtransSignature({ ...base, signature_key: signed })).toBe(false);
  });

  it("menolak tanda tangan yang dipalsukan memakai server key kosong", () => {
    // Algoritmanya publik. Kalau instalasi belum dikonfigurasi dan verifikasi
    // tetap memakai string kosong sebagai kunci, siapa pun bisa menghitung
    // tanda tangan yang lolos dan menambah saldonya sendiri secara gratis.
    const forged = sign(base.order_id, base.status_code, base.gross_amount, "");

    delete process.env.MIDTRANS_SERVER_KEY;
    expect(verifyMidtransSignature({ ...base, signature_key: forged })).toBe(false);

    process.env.MIDTRANS_SERVER_KEY = "";
    expect(verifyMidtransSignature({ ...base, signature_key: forged })).toBe(false);
  });

  it("menolak tanda tangan yang panjangnya tidak wajar", () => {
    expect(verifyMidtransSignature({ ...base, signature_key: "" })).toBe(false);
    expect(verifyMidtransSignature({ ...base, signature_key: "abc" })).toBe(false);
  });
});
