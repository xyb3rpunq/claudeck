// STEP 10 — Agregasi pemakaian token harian per user, untuk ditampilkan ke user
// sendiri sekaligus jadi bahan deteksi anomali/abuse.

export interface UsageRow {
  createdAt: Date;
  role: string;
  tokensUsed: number;
  costRp: number;
}

export interface DailyUsage {
  day: string; // YYYY-MM-DD
  inputTokens: number;
  outputTokens: number;
  costRp: number;
  messages: number;
}

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Kelompokkan pesan menjadi ringkasan harian. Pesan user membawa token input,
 * pesan assistant membawa token output beserta biayanya.
 *
 * Hasil diurutkan dari hari terbaru ke terlama, dan hanya berisi hari yang
 * benar-benar ada pemakaiannya.
 */
export function aggregateDailyUsage(rows: UsageRow[]): DailyUsage[] {
  const byDay = new Map<string, DailyUsage>();

  for (const row of rows) {
    const day = toDayKey(row.createdAt);
    const entry =
      byDay.get(day) ??
      { day, inputTokens: 0, outputTokens: 0, costRp: 0, messages: 0 };

    if (row.role === "assistant") {
      entry.outputTokens += row.tokensUsed;
      entry.costRp += row.costRp;
      entry.messages += 1;
    } else {
      entry.inputTokens += row.tokensUsed;
    }

    byDay.set(day, entry);
  }

  return Array.from(byDay.values()).sort((a, b) => b.day.localeCompare(a.day));
}

export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  costRp: number;
  messages: number;
}

export function sumUsage(daily: DailyUsage[]): UsageTotals {
  return daily.reduce<UsageTotals>(
    (acc, d) => ({
      inputTokens: acc.inputTokens + d.inputTokens,
      outputTokens: acc.outputTokens + d.outputTokens,
      costRp: acc.costRp + d.costRp,
      messages: acc.messages + d.messages,
    }),
    { inputTokens: 0, outputTokens: 0, costRp: 0, messages: 0 }
  );
}

/** Pemakaian dianggap wajar di bawah nominal ini, berapa pun lonjakannya. */
const ANOMALY_FLOOR_RP = 25_000;

/** Berapa kali lipat dari rata-rata hari sebelumnya yang dianggap mencurigakan. */
const ANOMALY_MULTIPLIER = 5;

export interface AnomalyReport {
  anomalous: boolean;
  todayCostRp: number;
  averageCostRp: number;
  ratio: number;
}

/**
 * Bandingkan pemakaian hari terbaru dengan rata-rata hari-hari sebelumnya.
 * Dipakai untuk menandai lonjakan yang tidak wajar (akun dibajak, script abuse),
 * bukan untuk memblokir otomatis.
 */
export function detectUsageAnomaly(daily: DailyUsage[]): AnomalyReport {
  const [today, ...previous] = daily;
  const todayCostRp = today?.costRp ?? 0;

  if (previous.length === 0) {
    return { anomalous: false, todayCostRp, averageCostRp: 0, ratio: 0 };
  }

  const averageCostRp =
    previous.reduce((sum, d) => sum + d.costRp, 0) / previous.length;

  // Rata-rata nol tapi hari ini besar juga termasuk lonjakan.
  const ratio = averageCostRp > 0 ? todayCostRp / averageCostRp : Infinity;

  return {
    anomalous: todayCostRp > ANOMALY_FLOOR_RP && ratio > ANOMALY_MULTIPLIER,
    todayCostRp,
    averageCostRp,
    ratio,
  };
}
