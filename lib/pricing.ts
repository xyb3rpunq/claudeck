// STEP 4 — Sistem Kredit & Pricing
//
// Kredit disimpan dalam Rupiah (1 kredit = Rp 1).
// RATE_PER_1K_TOKENS adalah harga jual per 1.000 token (input + output),
// sudah termasuk markup di atas harga resmi Anthropic API.
// Cek harga terbaru di https://console.anthropic.com sebelum mengubah markup.

export const RATE_PER_1K_TOKENS = 150; // Rp 150 per 1.000 token

/** Hitung biaya (dalam kredit / Rupiah) dari pemakaian token. */
export function calculateCost(inputTokens: number, outputTokens: number): number {
  const totalTokens = inputTokens + outputTokens;
  return (totalTokens / 1000) * RATE_PER_1K_TOKENS;
}

/** Konversi nominal top-up Rupiah menjadi kredit. */
export function convertRupiahToCredit(amountRp: number): number {
  return amountRp; // 1 kredit = Rp 1
}

/** Paket top-up yang tersedia. */
export const TOPUP_PACKAGES = [
  { id: "paket-50", label: "Rp 50.000", amountRp: 50_000 },
  { id: "paket-100", label: "Rp 100.000", amountRp: 100_000 },
  { id: "paket-250", label: "Rp 250.000", amountRp: 250_000 },
] as const;

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}
