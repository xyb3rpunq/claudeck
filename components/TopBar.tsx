"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { formatRupiah } from "@/lib/pricing";

export default function TopBar({
  email,
  creditBalance,
  onMenuClick,
}: {
  email: string;
  creditBalance: number;
  onMenuClick?: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-2 border-b border-zinc-800 px-4 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenuClick}
          aria-label="Buka menu"
          className="rounded-lg border border-zinc-700 px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-800 sm:hidden"
        >
          ☰
        </button>
        <span className="truncate text-sm text-zinc-400">{email}</span>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
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
