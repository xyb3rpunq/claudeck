"use client";

import Link from "next/link";

export default function TopupModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center">
        <div className="text-3xl">💳</div>
        <h2 className="mt-3 text-lg font-bold">Saldo Kredit Habis</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Saldo kreditmu sudah habis. Top-up dulu untuk melanjutkan percakapan.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Nanti
          </button>
          <Link
            href="/dashboard/topup"
            className="flex-1 rounded-lg bg-orange-500 py-2 text-sm font-semibold text-white hover:bg-orange-400"
          >
            Top-up Sekarang
          </Link>
        </div>
      </div>
    </div>
  );
}
