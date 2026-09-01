import { describe, expect, it } from "vitest";
import { HISTORY_TOKEN_BUDGET, trimHistory, type HistoryMessage } from "@/lib/history";
import { estimateTokens } from "@/lib/billing";

function turn(role: "user" | "assistant", chars: number, tag = ""): HistoryMessage {
  return { role, content: tag + "x".repeat(Math.max(0, chars - tag.length)) };
}

describe("trimHistory", () => {
  it("membiarkan percakapan pendek apa adanya", () => {
    const messages: HistoryMessage[] = [
      turn("user", 100),
      turn("assistant", 200),
      turn("user", 100),
    ];
    const result = trimHistory(messages);
    expect(result.messages).toHaveLength(3);
    expect(result.droppedCount).toBe(0);
  });

  it("membuang pesan terlama saat melewati anggaran", () => {
    // 40 giliran x ~3.000 token jauh melebihi anggaran 24.000 token.
    const messages: HistoryMessage[] = [];
    for (let i = 0; i < 40; i++) {
      messages.push(turn(i % 2 === 0 ? "user" : "assistant", 9_000));
    }
    const result = trimHistory(messages);

    expect(result.droppedCount).toBeGreaterThan(0);
    expect(result.messages.length).toBeLessThan(messages.length);
    expect(result.estimatedTokens).toBeLessThanOrEqual(HISTORY_TOKEN_BUDGET);
  });

  it("mempertahankan pesan terbaru, bukan yang terlama", () => {
    // Dua pesan pertama saja (masing-masing ~15.000 token) sudah melewati
    // anggaran 24.000 token, jadi yang terlama harus tersingkir.
    const messages: HistoryMessage[] = [
      turn("user", 45_000, "LAMA"),
      turn("assistant", 45_000),
      turn("user", 60, "BARU"),
    ];
    const result = trimHistory(messages);
    const joined = result.messages.map((m) => m.content).join("");
    expect(joined).toContain("BARU");
    expect(joined).not.toContain("LAMA");
  });

  it("tidak pernah membuang pesan terakhir walau sendirian melebihi anggaran", () => {
    // Satu pesan raksasa: tetap harus dikirim, biar API yang menolak kalau perlu,
    // daripada mengirim percakapan kosong.
    const messages: HistoryMessage[] = [turn("user", HISTORY_TOKEN_BUDGET * 10)];
    const result = trimHistory(messages);
    expect(result.messages).toHaveLength(1);
    expect(result.droppedCount).toBe(0);
  });

  it("tidak pernah mengawali riwayat dengan giliran assistant", () => {
    // API menolak riwayat yang dimulai dari assistant.
    for (const budget of [500, 2_000, 8_000, HISTORY_TOKEN_BUDGET]) {
      const messages: HistoryMessage[] = [];
      for (let i = 0; i < 30; i++) {
        messages.push(turn(i % 2 === 0 ? "user" : "assistant", 1_500));
      }
      const result = trimHistory(messages, budget);
      if (result.messages.length > 0) {
        expect(result.messages[0].role).toBe("user");
      }
    }
  });

  it("menghormati anggaran khusus yang diberikan", () => {
    const messages: HistoryMessage[] = [];
    for (let i = 0; i < 20; i++) {
      messages.push(turn(i % 2 === 0 ? "user" : "assistant", 3_000));
    }
    const kecil = trimHistory(messages, 2_000);
    const besar = trimHistory(messages, 20_000);
    expect(kecil.messages.length).toBeLessThan(besar.messages.length);
  });

  it("melaporkan estimasi token yang konsisten dengan isi yang dipertahankan", () => {
    const messages: HistoryMessage[] = [turn("user", 300), turn("assistant", 600)];
    const result = trimHistory(messages);
    const expected = result.messages.reduce((s, m) => s + estimateTokens(m.content), 0);
    expect(result.estimatedTokens).toBe(expected);
  });

  it("aman untuk riwayat kosong", () => {
    expect(trimHistory([])).toEqual({ messages: [], droppedCount: 0, estimatedTokens: 0 });
  });
});
