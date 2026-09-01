"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(JSON.stringify({ event: "client_error", digest: error.digest }));
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">Ada yang bermasalah</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Terjadi kesalahan tak terduga. Coba muat ulang halaman ini.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
          >
            Coba Lagi
          </button>
          <Link
            href="/dashboard/chat"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Ke Chat
          </Link>
        </div>
      </div>
    </main>
  );
}
