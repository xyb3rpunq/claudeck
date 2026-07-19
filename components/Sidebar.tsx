"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type ConversationItem = { id: string; title: string; createdAt: string };

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, pathname]);

  async function handleDelete(id: string) {
    if (!confirm("Hapus percakapan ini?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (pathname === `/dashboard/chat/${id}`) {
      router.push("/dashboard/chat");
    }
  }

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/50 sm:flex">
      <div className="p-4">
        <Link href="/" className="text-lg font-bold">
          Claude<span className="text-orange-400">ck</span>
        </Link>
      </div>
      <div className="px-3">
        <Link
          href="/dashboard/chat"
          className="block w-full rounded-lg bg-orange-500 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-orange-400"
        >
          + New Chat
        </Link>
      </div>
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          <p className="px-2 text-sm text-zinc-500">Memuat...</p>
        ) : conversations.length === 0 ? (
          <p className="px-2 text-sm text-zinc-500">Belum ada percakapan.</p>
        ) : (
          conversations.map((c) => {
            const active = pathname === `/dashboard/chat/${c.id}`;
            return (
              <div
                key={c.id}
                className={`group flex items-center rounded-lg text-sm ${
                  active ? "bg-zinc-800" : "hover:bg-zinc-800/60"
                }`}
              >
                <Link
                  href={`/dashboard/chat/${c.id}`}
                  className="min-w-0 flex-1 truncate px-3 py-2 text-zinc-300"
                  title={c.title}
                >
                  {c.title}
                </Link>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="hidden px-2 text-zinc-500 hover:text-red-400 group-hover:block"
                  title="Hapus"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </nav>
      <div className="space-y-1 border-t border-zinc-800 p-3 text-sm">
        <Link
          href="/dashboard/billing"
          className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
        >
          Billing
        </Link>
        <Link
          href="/dashboard/topup"
          className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
        >
          Top-up
        </Link>
      </div>
    </aside>
  );
}
