// Membatasi seberapa banyak riwayat percakapan yang ikut dikirim ke model.
//
// Tanpa batas, setiap giliran mengirim ulang SELURUH percakapan: biaya tumbuh
// kuadratik terhadap panjang percakapan, dan pada akhirnya request ditolak
// karena melewati jendela konteks model.

import { estimateTokens } from "@/lib/billing";

export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Anggaran token untuk riwayat. Jauh di bawah jendela konteks model (200K–1M)
 * karena yang membatasi di sini biaya, bukan kemampuan model: percakapan
 * sepanjang ini pun sudah memberi konteks lebih dari cukup untuk chat.
 */
export const HISTORY_TOKEN_BUDGET = 24_000;

export interface TrimmedHistory {
  messages: HistoryMessage[];
  droppedCount: number;
  estimatedTokens: number;
}

/**
 * Ambil pesan-pesan terbaru yang masih muat dalam anggaran, dari yang paling
 * baru mundur ke belakang. Pesan terlama yang tidak muat dibuang.
 *
 * Hasilnya selalu diawali pesan ber-role "user": model menolak riwayat yang
 * dimulai dengan giliran assistant.
 */
export function trimHistory(
  messages: HistoryMessage[],
  budget: number = HISTORY_TOKEN_BUDGET
): TrimmedHistory {
  const kept: HistoryMessage[] = [];
  let used = 0;

  for (let i = messages.length - 1; i >= 0; i--) {
    const cost = estimateTokens(messages[i].content);
    if (used + cost > budget && kept.length > 0) break;
    kept.unshift(messages[i]);
    used += cost;
  }

  // Buang giliran assistant yang menggantung di awal.
  while (kept.length > 0 && kept[0].role === "assistant") {
    used -= estimateTokens(kept[0].content);
    kept.shift();
  }

  return {
    messages: kept,
    droppedCount: messages.length - kept.length,
    estimatedTokens: used,
  };
}
