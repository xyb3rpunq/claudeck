import { describe, expect, it } from "vitest";
import {
  MARKUP_MULTIPLIER,
  MODELS,
  MODEL_IDS,
  USD_TO_IDR,
  calculateCost,
  estimateMessages,
  formatContextWindow,
  isModelId,
  ratePer1kTokens,
  resolveModel,
  DEFAULT_MODEL,
  type ModelId,
  type TokenUsage,
} from "@/lib/pricing";

/** Biaya modal sebenarnya (Rupiah) yang kita bayar ke Anthropic. */
function anthropicCostRp(modelId: ModelId, usage: TokenUsage): number {
  const spec = MODELS[modelId];
  const inputUsd = (usage.inputTokens / 1_000_000) * spec.usdInputPerMTok;
  const cacheWriteUsd =
    ((usage.cacheWriteTokens ?? 0) / 1_000_000) * spec.usdInputPerMTok * 1.25;
  const cacheReadUsd =
    ((usage.cacheReadTokens ?? 0) / 1_000_000) * spec.usdInputPerMTok * 0.1;
  const outputUsd = (usage.outputTokens / 1_000_000) * spec.usdOutputPerMTok;
  return (inputUsd + cacheWriteUsd + cacheReadUsd + outputUsd) * USD_TO_IDR;
}

describe("calculateCost", () => {
  // Bentuk pemakaian yang dulu membuat tarif flat rugi: pertanyaan pendek,
  // jawaban panjang. Harga output 5x input, jadi ini kasus paling berbahaya.
  const shortPromptLongAnswer: TokenUsage = { inputTokens: 100, outputTokens: 1000 };

  it("selalu menagih di atas biaya modal Anthropic untuk semua model", () => {
    const shapes: TokenUsage[] = [
      shortPromptLongAnswer,
      { inputTokens: 1000, outputTokens: 100 },
      { inputTokens: 1500, outputTokens: 500 },
      { inputTokens: 50_000, outputTokens: 4000 },
      { inputTokens: 200, outputTokens: 200, cacheReadTokens: 10_000, cacheWriteTokens: 2_000 },
    ];

    for (const modelId of MODEL_IDS) {
      for (const usage of shapes) {
        const charged = calculateCost(modelId, usage);
        const cost = anthropicCostRp(modelId, usage);
        expect(charged).toBeGreaterThan(cost);
        // Margin harus persis sesuai markup yang dikonfigurasi.
        expect(charged / cost).toBeCloseTo(MARKUP_MULTIPLIER, 6);
      }
    }
  });

  it("menagih tarif flat lama sebagai perbandingan — tarif lama merugi", () => {
    // Regresi terhadap bug yang diperbaiki: Rp 150 per 1.000 total token.
    const legacyFlatRate = 150;
    const totalTokens =
      shortPromptLongAnswer.inputTokens + shortPromptLongAnswer.outputTokens;
    const legacyCharge = (totalTokens / 1000) * legacyFlatRate;
    const actualCost = anthropicCostRp("claude-sonnet-5", shortPromptLongAnswer);

    expect(legacyCharge).toBeLessThan(actualCost); // inilah bug-nya
    expect(calculateCost("claude-sonnet-5", shortPromptLongAnswer)).toBeGreaterThan(
      actualCost
    );
  });

  it("menghargai token output lebih mahal daripada token input", () => {
    for (const modelId of MODEL_IDS) {
      const inputHeavy = calculateCost(modelId, { inputTokens: 1000, outputTokens: 0 });
      const outputHeavy = calculateCost(modelId, { inputTokens: 0, outputTokens: 1000 });
      expect(outputHeavy).toBeGreaterThan(inputHeavy);
      expect(outputHeavy / inputHeavy).toBeCloseTo(
        MODELS[modelId].usdOutputPerMTok / MODELS[modelId].usdInputPerMTok,
        6
      );
    }
  });

  it("menagih cache read jauh lebih murah daripada input biasa", () => {
    const plain = calculateCost("claude-sonnet-5", { inputTokens: 10_000, outputTokens: 0 });
    const cached = calculateCost("claude-sonnet-5", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 10_000,
    });
    expect(cached).toBeCloseTo(plain * 0.1, 6);
  });

  it("menagih cache write sedikit lebih mahal daripada input biasa", () => {
    const plain = calculateCost("claude-opus-5", { inputTokens: 5_000, outputTokens: 0 });
    const written = calculateCost("claude-opus-5", {
      inputTokens: 0,
      outputTokens: 0,
      cacheWriteTokens: 5_000,
    });
    expect(written).toBeCloseTo(plain * 1.25, 6);
  });

  it("mengembalikan 0 untuk pemakaian kosong", () => {
    expect(calculateCost("claude-haiku-4-5", { inputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it("mengurutkan harga model dari termurah ke termahal", () => {
    const usage: TokenUsage = { inputTokens: 1000, outputTokens: 1000 };
    const haiku = calculateCost("claude-haiku-4-5", usage);
    const sonnet = calculateCost("claude-sonnet-5", usage);
    const opus = calculateCost("claude-opus-5", usage);
    expect(haiku).toBeLessThan(sonnet);
    expect(sonnet).toBeLessThan(opus);
  });
});

describe("ratePer1kTokens", () => {
  it("cocok dengan harga resmi dikali kurs dan markup", () => {
    expect(ratePer1kTokens("claude-sonnet-5", "input")).toBeCloseTo(
      (2 / 1_000_000) * USD_TO_IDR * MARKUP_MULTIPLIER * 1000,
      6
    );
    expect(ratePer1kTokens("claude-sonnet-5", "output")).toBeCloseTo(
      (10 / 1_000_000) * USD_TO_IDR * MARKUP_MULTIPLIER * 1000,
      6
    );
  });
});

describe("resolveModel / isModelId", () => {
  it("menerima model yang valid", () => {
    expect(isModelId("claude-opus-5")).toBe(true);
    expect(resolveModel("claude-opus-5")).toBe("claude-opus-5");
  });

  it("menolak input tak dikenal dan jatuh ke model default", () => {
    // Termasuk model lama yang sudah tidak dipakai — jangan sampai dipakai diam-diam.
    for (const bad of ["claude-sonnet-4-6", "gpt-4", "", null, undefined, 42, {}]) {
      expect(isModelId(bad)).toBe(false);
      expect(resolveModel(bad)).toBe(DEFAULT_MODEL);
    }
  });
});

describe("estimateMessages", () => {
  it("memberi lebih banyak pesan untuk model yang lebih murah", () => {
    expect(estimateMessages(50_000, "claude-haiku-4-5")).toBeGreaterThan(
      estimateMessages(50_000, "claude-opus-5")
    );
  });

  it("berskala linier terhadap nominal top-up", () => {
    const small = estimateMessages(50_000);
    const large = estimateMessages(100_000);
    expect(large).toBeGreaterThanOrEqual(small * 2 - 1);
  });
});

describe("formatContextWindow", () => {
  it("memakai satuan K dan M", () => {
    expect(formatContextWindow(200_000)).toBe("200K");
    expect(formatContextWindow(1_000_000)).toBe("1M");
  });
});
