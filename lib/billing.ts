// Menentukan berapa banyak yang boleh dihasilkan sebuah request, berdasarkan
// saldo user. Ini yang menjaga saldo tidak pernah jebol jauh ke minus: alih-alih
// menolak user bersaldo tipis, kita persempit max_tokens sesuai kemampuannya.

import {
  MODELS,
  USD_TO_IDR,
  MARKUP_MULTIPLIER,
  type ModelId,
} from "@/lib/pricing";

/** Jawaban lebih pendek dari ini tidak berguna — lebih baik minta user top-up. */
export const MIN_OUTPUT_TOKENS = 256;

/** Batas atas panjang jawaban, berlaku untuk semua user. */
export const MAX_OUTPUT_TOKENS = 4096;

function rupiahPerToken(usdPerMTok: number): number {
  return (usdPerMTok / 1_000_000) * USD_TO_IDR * MARKUP_MULTIPLIER;
}

export function rupiahPerInputToken(modelId: ModelId): number {
  return rupiahPerToken(MODELS[modelId].usdInputPerMTok);
}

export function rupiahPerOutputToken(modelId: ModelId): number {
  return rupiahPerToken(MODELS[modelId].usdOutputPerMTok);
}

/**
 * Estimasi jumlah token dari teks. Sengaja konservatif (membagi 3, bukan 4)
 * supaya biaya ditaksir lebih tinggi, bukan lebih rendah.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

/**
 * Berapa token output yang mampu dibayar saldo user setelah menyisihkan
 * perkiraan biaya input. Hasilnya dibatasi MAX_OUTPUT_TOKENS di atas, dan bisa
 * 0 kalau saldo tidak cukup bahkan untuk input-nya saja.
 */
export function affordableOutputTokens(params: {
  modelId: ModelId;
  creditBalance: number;
  estimatedInputTokens: number;
}): number {
  const { modelId, creditBalance, estimatedInputTokens } = params;
  const inputCost = estimatedInputTokens * rupiahPerInputToken(modelId);
  const remaining = creditBalance - inputCost;
  if (remaining <= 0) return 0;

  const affordable = Math.floor(remaining / rupiahPerOutputToken(modelId));
  return Math.max(0, Math.min(MAX_OUTPUT_TOKENS, affordable));
}

/** Saldo minimum agar sebuah request layak dijalankan pada model tertentu. */
export function minimumBalanceFor(modelId: ModelId, estimatedInputTokens: number): number {
  return (
    estimatedInputTokens * rupiahPerInputToken(modelId) +
    MIN_OUTPUT_TOKENS * rupiahPerOutputToken(modelId)
  );
}
