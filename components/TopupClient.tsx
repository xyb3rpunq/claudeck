"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { TOPUP_PACKAGES, formatRupiah, RATE_PER_1K_TOKENS } from "@/lib/pricing";

declare global {
  interface Window {
    snap?: {
      pay: (
        token: string,
        callbacks: {
          onSuccess?: () => void;
          onPending?: () => void;
          onError?: () => void;
          onClose?: () => void;
        }
      ) => void;
    };
  }
}

export default function TopupClient({
  snapJsUrl,
  clientKey,
}: {
  snapJsUrl: string;
  clientKey: string;
}) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePay(packageId: string) {
    setError(null);
    setNotice(null);
    setLoadingId(packageId);
    try {
      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal membuat transaksi.");
        return;
      }
      if (window.snap) {
        window.snap.pay(data.token, {
          onSuccess: () => {
            setNotice("Pembayaran berhasil! Saldo akan bertambah otomatis.");
            router.refresh();
          },
          onPending: () =>
            setNotice("Menunggu pembayaran. Saldo bertambah setelah pembayaran dikonfirmasi."),
          onError: () => setError("Pembayaran gagal. Coba lagi."),
          onClose: () => setNotice("Popup pembayaran ditutup."),
        });
      } else if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch {
      setError("Koneksi bermasalah. Coba lagi.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <Script src={snapJsUrl} data-client-key={clientKey} strategy="afterInteractive" />
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold">Top-up Saldo</h1>
        <p className="mt-2 text-sm text-zinc-400">
          1 kredit = Rp 1 · Biaya chat Rp {RATE_PER_1K_TOKENS}/1.000 token.
          Pembayaran diproses aman via Midtrans.
        </p>

        {notice && (
          <p className="mt-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {notice}
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {TOPUP_PACKAGES.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center"
            >
              <div className="text-2xl font-bold">{p.label}</div>
              <div className="mt-2 text-sm text-zinc-400">
                = {formatRupiah(p.amountRp)} kredit
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                ± {Math.floor((p.amountRp / RATE_PER_1K_TOKENS) * 1000).toLocaleString("id-ID")}{" "}
                token
              </div>
              <button
                onClick={() => handlePay(p.id)}
                disabled={loadingId !== null}
                className="mt-6 w-full rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-400 disabled:opacity-50"
              >
                {loadingId === p.id ? "Memproses..." : "Bayar"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
