"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type ConversationItem = { id: string; title: string; createdAt: string };

export default function Sidebar({
  open = false,
  onClose,
}: {
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

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

  function startRename(c: ConversationItem) {
    setEditingId(c.id);
    setDraftTitle(c.title);
  }

  async function commitRename(id: string) {
    const title = draftTitle.trim();
    setEditingId(null);
    if (!title) return;

    const previous = conversations;
    // Tampilkan judul baru dulu, kembalikan kalau server menolak.
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c))
    );
    const res = await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) setConversations(previous);
  }

  const panel = (
    <>
      <div className="p-4">
        <Link href="/" className="text-lg font-bold">
          Claude<span className="text-orange-400">ck</span>
        </Link>
      </div>
      <div className="px-3">
        <Link
          href="/dashboard/chat"
          onClick={onClose}
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
            if (editingId === c.id) {
              return (
                <input
                  key={c.id}
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={() => commitRename(c.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(c.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  maxLength={100}
                  className="w-full rounded-lg border border-orange-400 bg-zinc-900 px-3 py-2 text-sm outline-none"
                />
              );
            }
            return (
              <div
                key={c.id}
                className={`group/item flex items-center rounded-lg text-sm ${
                  active ? "bg-zinc-800" : "hover:bg-zinc-800/60"
                }`}
              >
                <Link
                  href={`/dashboard/chat/${c.id}`}
                  onClick={onClose}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    startRename(c);
                  }}
                  className="min-w-0 flex-1 truncate px-3 py-2 text-zinc-300"
                  title={`${c.title} (klik dua kali untuk ganti nama)`}
                >
                  {c.title}
                </Link>
                <button
                  onClick={() => startRename(c)}
                  className="px-1 text-zinc-500 hover:text-orange-400 sm:opacity-0 sm:group-hover/item:opacity-100"
                  title="Ganti nama"
                  aria-label="Ganti nama percakapan"
                >
                  ✎
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="px-2 text-zinc-500 hover:text-red-400 sm:opacity-0 sm:group-hover/item:opacity-100"
                  title="Hapus"
                  aria-label="Hapus percakapan"
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
          href="/dashboard/usage"
          onClick={onClose}
          className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
        >
          Pemakaian
        </Link>
        <Link
          href="/dashboard/billing"
          onClick={onClose}
          className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
        >
          Billing
        </Link>
        <Link
          href="/dashboard/topup"
          onClick={onClose}
          className="block rounded-lg px-3 py-2 text-zinc-300 hover:bg-zinc-800"
        >
          Top-up
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: kolom tetap */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-zinc-800 bg-zinc-900/50 sm:flex">
        {panel}
      </aside>

      {/* Mobile: drawer */}
      {open && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            onClick={onClose}
            aria-label="Tutup menu"
            className="absolute inset-0 h-full w-full bg-black/60"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950">
            {panel}
          </aside>
        </div>
      )}
    </>
  );
}
