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
 * Estimasi jumlah token dari teks, sengaja dibuat menaksir lebih tinggi supaya
 * jatah output tidak pernah kelewat longgar.
 *
 * Teks Latin rata-rata ~4 karakter per token, jadi membaginya 3 sudah aman.
 * Tapi rasio itu tidak berlaku untuk aksara non-Latin: satu karakter Mandarin,
 * Jepang, Korea, Arab, atau satu emoji umumnya menghabiskan sekitar satu token
 * atau lebih. Membaginya 3 juga akan menaksir SEPERTIGA dari yang sebenarnya —
 * dan taksiran yang terlalu rendah membuat saldo bisa jebol ke minus.
 *
 * Karena itu karakter non-ASCII dihitung satu token per unit UTF-16 (emoji yang
 * memakai surrogate pair otomatis terhitung dua).
 */
export function estimateTokens(text: string): number {
  let asciiChars = 0;
  let nonAsciiUnits = 0;

  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 127) nonAsciiUnits++;
    else asciiChars++;
  }

  return Math.ceil(asciiChars / 3) + nonAsciiUnits;
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
