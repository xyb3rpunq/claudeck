"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { formatRupiah } from "@/lib/pricing";

export default function TopBar({
  email,
  creditBalance,
}: {
  email: string;
  creditBalance: number;
}) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
      <div className="text-sm text-zinc-400">{email}</div>
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/topup"
          className="rounded-full bg-zinc-800 px-3 py-1 text-sm hover:bg-zinc-700"
          title="Sisa saldo kredit — klik untuk top-up"
        >
          💳 {formatRupiah(Math.max(0, creditBalance))}
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg border border-zinc-700 px-3 py-1 text-sm text-zinc-300 hover:bg-zinc-800"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
