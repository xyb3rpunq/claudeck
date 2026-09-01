// STEP 10 — Halaman pemakaian: token harian + biaya, plus peringatan lonjakan.
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/pricing";
import { aggregateDailyUsage, detectUsageAnomaly, sumUsage } from "@/lib/usage";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 30;

export default async function UsagePage() {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login");

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await prisma.message.findMany({
    where: { conversation: { userId }, createdAt: { gte: since } },
    select: { createdAt: true, role: true, tokensUsed: true, costRp: true },
    orderBy: { createdAt: "desc" },
  });

  const daily = aggregateDailyUsage(rows);
  const totals = sumUsage(daily);
  const anomaly = detectUsageAnomaly(daily);
  const peakCost = Math.max(...daily.map((d) => d.costRp), 1);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Pemakaian</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Ringkasan {WINDOW_DAYS} hari terakhir.
        </p>

        {anomaly.anomalous && (
          <p className="mt-4 rounded-lg bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
            Pemakaian hari ini ({formatRupiah(anomaly.todayCostRp)}) jauh di atas
            rata-rata harianmu ({formatRupiah(anomaly.averageCostRp)}). Kalau ini
            bukan kamu, segera ganti password.
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-sm text-zinc-400">Total biaya</div>
            <div className="mt-1 text-2xl font-bold">{formatRupiah(totals.costRp)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-sm text-zinc-400">Pesan</div>
            <div className="mt-1 text-2xl font-bold">
              {totals.messages.toLocaleString("id-ID")}
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="text-sm text-zinc-400">Token</div>
            <div className="mt-1 text-2xl font-bold">
              {(totals.inputTokens + totals.outputTokens).toLocaleString("id-ID")}
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              {totals.inputTokens.toLocaleString("id-ID")} masuk ·{" "}
              {totals.outputTokens.toLocaleString("id-ID")} keluar
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-semibold">Per Hari</h2>
        {daily.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Belum ada pemakaian dalam {WINDOW_DAYS} hari terakhir.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {daily.map((d) => (
              <div key={d.day} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="flex items-baseline justify-between gap-4 text-sm">
                  <span className="font-medium text-zinc-200">
                    {new Date(`${d.day}T00:00:00Z`).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    })}
                  </span>
                  <span className="text-zinc-300">{formatRupiah(d.costRp)}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{ width: `${Math.max(2, (d.costRp / peakCost) * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {d.messages} pesan · {d.inputTokens.toLocaleString("id-ID")} token masuk ·{" "}
                  {d.outputTokens.toLocaleString("id-ID")} token keluar
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
