// STEP 4 — Sistem Kredit & Pricing
//
// Kredit disimpan dalam Rupiah (1 kredit = Rp 1).
//
// PENTING: input dan output dihitung TERPISAH. Harga output Anthropic 5x lipat
// harga input, jadi tarif flat per total token akan rugi pada percakapan dengan
// jawaban panjang (contoh: 100 token input + 1000 token output).
//
// Tarif dasar di bawah adalah harga resmi Anthropic API (USD per 1 juta token).
// Cek ulang di https://platform.claude.com sebelum mengubah markup.

/** Kurs yang dipakai untuk konversi harga modal USD ke Rupiah. */
export const USD_TO_IDR = 16_500;

/** Margin di atas harga modal Anthropic. 1.6 = markup 60%. */
export const MARKUP_MULTIPLIER = 1.6;

/** Biaya tulis/baca prompt cache relatif terhadap tarif input (skema Anthropic). */
const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

export const MODEL_IDS = [
  "claude-haiku-4-5",
  "claude-sonnet-5",
  "claude-opus-5",
] as const;

export type ModelId = (typeof MODEL_IDS)[number];

export interface ModelSpec {
  id: ModelId;
  label: string;
  tagline: string;
  /** Harga resmi Anthropic, USD per 1 juta token. */
  usdInputPerMTok: number;
  usdOutputPerMTok: number;
  contextTokens: number;
  /**
   * Haiku 4.5 menolak `output_config.effort` dan adaptive thinking;
   * Sonnet 5 / Opus 5 mendukung keduanya.
   */
  supportsEffort: boolean;
  supportsAdaptiveThinking: boolean;
}

export const MODELS: Record<ModelId, ModelSpec> = {
  "claude-haiku-4-5": {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    tagline: "Tercepat & termurah",
    usdInputPerMTok: 1,
    usdOutputPerMTok: 5,
    contextTokens: 200_000,
    supportsEffort: false,
    supportsAdaptiveThinking: false,
  },
  "claude-sonnet-5": {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    tagline: "Seimbang untuk sehari-hari",
    usdInputPerMTok: 2,
    usdOutputPerMTok: 10,
    contextTokens: 1_000_000,
    supportsEffort: true,
    supportsAdaptiveThinking: true,
  },
  "claude-opus-5": {
    id: "claude-opus-5",
    label: "Opus 5",
    tagline: "Paling cerdas untuk tugas berat",
    usdInputPerMTok: 5,
    usdOutputPerMTok: 25,
    contextTokens: 1_000_000,
    supportsEffort: true,
    supportsAdaptiveThinking: true,
  },
};

export const DEFAULT_MODEL: ModelId = "claude-sonnet-5";

export function isModelId(value: unknown): value is ModelId {
  return typeof value === "string" && (MODEL_IDS as readonly string[]).includes(value);
}

export function resolveModel(value: unknown): ModelId {
  return isModelId(value) ? value : DEFAULT_MODEL;
}

function rupiahPerToken(usdPerMTok: number): number {
  return (usdPerMTok / 1_000_000) * USD_TO_IDR * MARKUP_MULTIPLIER;
}

/** Tarif jual per 1.000 token, untuk ditampilkan ke user. */
export function ratePer1kTokens(modelId: ModelId, kind: "input" | "output"): number {
  const spec = MODELS[modelId];
  return (
    rupiahPerToken(kind === "input" ? spec.usdInputPerMTok : spec.usdOutputPerMTok) * 1000
  );
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  /** Token yang dibaca dari prompt cache (jauh lebih murah). */
  cacheReadTokens?: number;
  /** Token yang ditulis ke prompt cache (sedikit lebih mahal). */
  cacheWriteTokens?: number;
}

/** Hitung biaya sebuah request dalam kredit (Rupiah). */
export function calculateCost(modelId: ModelId, usage: TokenUsage): number {
  const spec = MODELS[modelId] ?? MODELS[DEFAULT_MODEL];
  const inputRate = rupiahPerToken(spec.usdInputPerMTok);
  const outputRate = rupiahPerToken(spec.usdOutputPerMTok);

  return (
    usage.inputTokens * inputRate +
    (usage.cacheWriteTokens ?? 0) * inputRate * CACHE_WRITE_MULTIPLIER +
    (usage.cacheReadTokens ?? 0) * inputRate * CACHE_READ_MULTIPLIER +
    usage.outputTokens * outputRate
  );
}

/** Konversi nominal top-up Rupiah menjadi kredit. */
export function convertRupiahToCredit(amountRp: number): number {
  return amountRp; // 1 kredit = Rp 1
}

/**
 * Profil satu pesan chat "tipikal" (termasuk history yang ikut dikirim ulang).
 * Dipakai hanya untuk estimasi kasar di halaman pricing.
 */
export const TYPICAL_MESSAGE: TokenUsage = { inputTokens: 1_500, outputTokens: 500 };

/** Estimasi berapa pesan yang bisa dikirim dengan sejumlah kredit. */
export function estimateMessages(amountRp: number, modelId: ModelId = DEFAULT_MODEL): number {
  const perMessage = calculateCost(modelId, TYPICAL_MESSAGE);
  if (perMessage <= 0) return 0;
  return Math.floor(amountRp / perMessage);
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

/** Format ukuran konteks: 200.000 -> "200K", 1.000.000 -> "1M". */
export function formatContextWindow(tokens: number): string {
  if (tokens >= 1_000_000) {
    const millions = tokens / 1_000_000;
    return `${Number.isInteger(millions) ? millions : millions.toFixed(1)}M`;
  }
  return `${Math.round(tokens / 1000)}K`;
}

/** Format nominal kecil (biaya per pesan) yang bisa di bawah Rp 1. */
export function formatRupiahPrecise(value: number): string {
  if (value > 0 && value < 1) return "< Rp 1";
  return formatRupiah(value);
}
