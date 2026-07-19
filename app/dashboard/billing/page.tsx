// STEP 4 — Halaman billing: sisa saldo + riwayat transaksi.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRupiah } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  failed: "bg-red-500/10 text-red-400",
};

export default async function BillingPage() {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login");

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { creditBalance: true, plan: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  if (!user) redirect("/login");

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Billing</h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="text-sm text-zinc-400">Sisa Saldo Kredit</div>
            <div className="mt-2 text-3xl font-bold">
              {formatRupiah(Math.max(0, user.creditBalance))}
            </div>
            <Link
              href="/dashboard/topup"
              className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
            >
              Top-up Saldo
            </Link>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="text-sm text-zinc-400">Plan</div>
            <div className="mt-2 text-3xl font-bold capitalize">{user.plan}</div>
            <div className="mt-4 text-sm text-zinc-500">
              Bayar sesuai pakai — tanpa biaya bulanan.
            </div>
          </div>
        </div>

        <h2 className="mt-10 text-lg font-semibold">Riwayat Transaksi</h2>
        {transactions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">Belum ada transaksi.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-left text-zinc-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Tanggal</th>
                  <th className="px-4 py-3 font-medium">Nominal</th>
                  <th className="px-4 py-3 font-medium">Kredit</th>
                  <th className="px-4 py-3 font-medium">Ref</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-t border-zinc-800">
                    <td className="px-4 py-3 text-zinc-300">
                      {t.createdAt.toLocaleString("id-ID")}
                    </td>
                    <td className="px-4 py-3">{formatRupiah(t.amountRp)}</td>
                    <td className="px-4 py-3">{formatRupiah(t.creditsAdded)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {t.paymentRef}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          STATUS_STYLES[t.status] ?? "bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
