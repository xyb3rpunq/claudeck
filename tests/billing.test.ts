import { describe, expect, it } from "vitest";
import {
  MAX_OUTPUT_TOKENS,
  MIN_OUTPUT_TOKENS,
  affordableOutputTokens,
  estimateTokens,
  minimumBalanceFor,
  rupiahPerInputToken,
  rupiahPerOutputToken,
} from "@/lib/billing";
import { MODEL_IDS, calculateCost } from "@/lib/pricing";

describe("affordableOutputTokens", () => {
  it("memberi jatah penuh untuk saldo besar", () => {
    expect(
      affordableOutputTokens({
        modelId: "claude-sonnet-5",
        creditBalance: 1_000_000,
        estimatedInputTokens: 1_000,
      })
    ).toBe(MAX_OUTPUT_TOKENS);
  });

  it("mengembalikan 0 saat saldo habis atau minus", () => {
    for (const balance of [0, -50]) {
      expect(
        affordableOutputTokens({
          modelId: "claude-haiku-4-5",
          creditBalance: balance,
          estimatedInputTokens: 100,
        })
      ).toBe(0);
    }
  });

  it("mengembalikan 0 saat saldo tidak cukup bahkan untuk input-nya", () => {
    // 500.000 token input di Opus 5 jauh melebihi saldo Rp 100.
    expect(
      affordableOutputTokens({
        modelId: "claude-opus-5",
        creditBalance: 100,
        estimatedInputTokens: 500_000,
      })
    ).toBe(0);
  });

  it("mempersempit jatah output mengikuti saldo, bukan menolak user", () => {
    const tokens = affordableOutputTokens({
      modelId: "claude-sonnet-5",
      creditBalance: 500,
      estimatedInputTokens: 200,
    });
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(MAX_OUTPUT_TOKENS);
  });

  it("tidak pernah menjatah lebih dari yang sanggup dibayar saldo", () => {
    // Jaminan intinya: untuk setiap request yang DIIZINKAN jalan, biaya kasus
    // terburuk (jatah output terpakai habis) tidak boleh melebihi saldo.
    // Request yang jatahnya di bawah MIN_OUTPUT_TOKENS ditolak route dengan 402,
    // jadi tidak pernah ditagih sama sekali.
    let allowedCases = 0;

    for (const modelId of MODEL_IDS) {
      for (const balance of [50, 300, 1_500, 20_000]) {
        for (const inputTokens of [50, 2_000, 30_000]) {
          const outputTokens = affordableOutputTokens({
            modelId,
            creditBalance: balance,
            estimatedInputTokens: inputTokens,
          });
          if (outputTokens < MIN_OUTPUT_TOKENS) continue; // ditolak, tidak ditagih

          allowedCases++;
          const worstCase = calculateCost(modelId, { inputTokens, outputTokens });
          expect(worstCase).toBeLessThanOrEqual(balance);
        }
      }
    }

    // Pastikan matriks di atas benar-benar menguji jalur yang diizinkan.
    expect(allowedCases).toBeGreaterThan(0);
  });

  it("memberi jatah lebih banyak pada model yang lebih murah", () => {
    const args = { creditBalance: 2_000, estimatedInputTokens: 500 };
    expect(affordableOutputTokens({ modelId: "claude-haiku-4-5", ...args })).toBeGreaterThan(
      affordableOutputTokens({ modelId: "claude-opus-5", ...args })
    );
  });
});

describe("minimumBalanceFor", () => {
  it("konsisten dengan ambang MIN_OUTPUT_TOKENS", () => {
    for (const modelId of MODEL_IDS) {
      const inputTokens = 1_000;
      const needed = minimumBalanceFor(modelId, inputTokens);

      // Tepat di ambang: harus lolos.
      expect(
        affordableOutputTokens({ modelId, creditBalance: needed, estimatedInputTokens: inputTokens })
      ).toBeGreaterThanOrEqual(MIN_OUTPUT_TOKENS);

      // Sedikit di bawah ambang: harus ditolak.
      expect(
        affordableOutputTokens({
          modelId,
          creditBalance: needed - 1,
          estimatedInputTokens: inputTokens,
        })
      ).toBeLessThan(MIN_OUTPUT_TOKENS);
    }
  });
});

describe("estimateTokens", () => {
  it("menaksir lebih tinggi, bukan lebih rendah, untuk teks Latin", () => {
    // ~4 karakter per token adalah rasio umum; estimasi kita harus di atasnya.
    const text = "a".repeat(4000);
    expect(estimateTokens(text)).toBeGreaterThan(text.length / 4);
  });

  it("tidak menaksir terlalu rendah untuk aksara non-Latin", () => {
    // Satu karakter Mandarin/Jepang/Korea umumnya menghabiskan sekitar satu
    // token. Rumus lama (panjang / 3) menaksir hanya sepertiganya, yang membuat
    // jatah output kelewat longgar dan saldo bisa jebol ke minus.
    for (const teks of [
      "请把这份文件总结成三个要点",
      "この文書を三つの要点にまとめて",
      "이 문서를 세 가지 요점으로 정리해",
      "لخص هذا المستند في ثلاث نقاط",
    ]) {
      const nonAscii = [...teks].filter((c) => c.charCodeAt(0) > 127).length;
      expect(estimateTokens(teks)).toBeGreaterThanOrEqual(nonAscii);
      expect(estimateTokens(teks)).toBeGreaterThan(teks.length / 3);
    }
  });

  it("menghitung emoji lebih dari satu token", () => {
    // Emoji memakai surrogate pair dan biasanya menghabiskan 2+ token.
    expect(estimateTokens("🎉")).toBeGreaterThanOrEqual(2);
  });

  it("tetap tumbuh seiring panjang teks campuran", () => {
    const pendek = estimateTokens("halo 世界");
    const panjang = estimateTokens("halo 世界".repeat(10));
    expect(panjang).toBeGreaterThan(pendek * 5);
  });

  it("mengembalikan 0 untuk teks kosong", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("tarif per token", () => {
  it("output selalu lebih mahal daripada input", () => {
    for (const modelId of MODEL_IDS) {
      expect(rupiahPerOutputToken(modelId)).toBeGreaterThan(rupiahPerInputToken(modelId));
    }
  });
});
