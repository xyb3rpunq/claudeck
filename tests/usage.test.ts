import { describe, expect, it } from "vitest";
import {
  aggregateDailyUsage,
  detectUsageAnomaly,
  sumUsage,
  type DailyUsage,
  type UsageRow,
} from "@/lib/usage";

function row(day: string, role: "user" | "assistant", tokensUsed: number, costRp = 0): UsageRow {
  return { createdAt: new Date(`${day}T10:00:00Z`), role, tokensUsed, costRp };
}

describe("aggregateDailyUsage", () => {
  it("memisahkan token masuk (user) dari token keluar (assistant)", () => {
    const daily = aggregateDailyUsage([
      row("2026-08-30", "user", 1200),
      row("2026-08-30", "assistant", 400, 120.5),
    ]);

    expect(daily).toHaveLength(1);
    expect(daily[0]).toMatchObject({
      day: "2026-08-30",
      inputTokens: 1200,
      outputTokens: 400,
      messages: 1,
    });
    expect(daily[0].costRp).toBeCloseTo(120.5, 6);
  });

  it("mengelompokkan beberapa pesan pada hari yang sama", () => {
    const daily = aggregateDailyUsage([
      row("2026-08-30", "user", 100),
      row("2026-08-30", "assistant", 200, 50),
      row("2026-08-30", "user", 300),
      row("2026-08-30", "assistant", 400, 70),
    ]);

    expect(daily).toHaveLength(1);
    expect(daily[0].inputTokens).toBe(400);
    expect(daily[0].outputTokens).toBe(600);
    expect(daily[0].messages).toBe(2);
    expect(daily[0].costRp).toBeCloseTo(120, 6);
  });

  it("mengurutkan dari hari terbaru ke terlama", () => {
    const daily = aggregateDailyUsage([
      row("2026-08-28", "assistant", 10, 5),
      row("2026-08-30", "assistant", 10, 5),
      row("2026-08-29", "assistant", 10, 5),
    ]);
    expect(daily.map((d) => d.day)).toEqual(["2026-08-30", "2026-08-29", "2026-08-28"]);
  });

  it("mengembalikan daftar kosong tanpa data", () => {
    expect(aggregateDailyUsage([])).toEqual([]);
  });
});

describe("sumUsage", () => {
  it("menjumlahkan seluruh hari", () => {
    const daily = aggregateDailyUsage([
      row("2026-08-29", "user", 100),
      row("2026-08-29", "assistant", 50, 30),
      row("2026-08-30", "user", 200),
      row("2026-08-30", "assistant", 80, 45),
    ]);
    expect(sumUsage(daily)).toMatchObject({
      inputTokens: 300,
      outputTokens: 130,
      messages: 2,
    });
    expect(sumUsage(daily).costRp).toBeCloseTo(75, 6);
  });

  it("mengembalikan nol untuk daftar kosong", () => {
    expect(sumUsage([])).toEqual({ inputTokens: 0, outputTokens: 0, costRp: 0, messages: 0 });
  });
});

function daily(costs: number[]): DailyUsage[] {
  // costs[0] dianggap hari terbaru, sesuai urutan keluaran aggregateDailyUsage.
  return costs.map((costRp, i) => ({
    day: `2026-08-${String(30 - i).padStart(2, "0")}`,
    inputTokens: 0,
    outputTokens: 0,
    costRp,
    messages: 1,
  }));
}

describe("detectUsageAnomaly", () => {
  it("menandai lonjakan besar di atas ambang nominal", () => {
    const report = detectUsageAnomaly(daily([300_000, 1_000, 2_000, 1_500]));
    expect(report.anomalous).toBe(true);
    expect(report.ratio).toBeGreaterThan(5);
  });

  it("tidak menandai pemakaian yang stabil", () => {
    expect(detectUsageAnomaly(daily([30_000, 28_000, 31_000])).anomalous).toBe(false);
  });

  it("tidak menandai lonjakan kecil di bawah ambang nominal", () => {
    // Rasio 20x, tapi nominalnya cuma Rp 2.000 — bukan sesuatu yang perlu alarm.
    const report = detectUsageAnomaly(daily([2_000, 100, 100]));
    expect(report.ratio).toBeGreaterThan(5);
    expect(report.anomalous).toBe(false);
  });

  it("tidak menandai apa pun saat baru ada satu hari data", () => {
    expect(detectUsageAnomaly(daily([500_000])).anomalous).toBe(false);
  });

  it("menangani rata-rata nol tanpa menghasilkan NaN", () => {
    const report = detectUsageAnomaly(daily([100_000, 0, 0]));
    expect(report.ratio).toBe(Infinity);
    expect(report.anomalous).toBe(true);
  });

  it("aman untuk daftar kosong", () => {
    expect(detectUsageAnomaly([])).toMatchObject({ anomalous: false, todayCostRp: 0 });
  });
});
