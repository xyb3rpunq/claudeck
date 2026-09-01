"use client";

// STEP 6 — UI chat dengan streaming response real-time (ReadableStream dari fetch),
// auto-resize textarea, loading state, dan error handling (402 → modal top-up).

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MessageBubble from "@/components/MessageBubble";
import ModelPicker from "@/components/ModelPicker";
import TopupModal from "@/components/TopupModal";
import { DEFAULT_MODEL, resolveModel, type ModelId } from "@/lib/pricing";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function ChatWindow({
  conversationId,
}: {
  conversationId: string | null;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(Boolean(conversationId));
  const [error, setError] = useState<string | null>(null);
  const [showTopup, setShowTopup] = useState(false);
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Muat riwayat percakapan
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoadingHistory(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (!cancelled) {
        if (res.ok) {
          const data = await res.json();
          setMessages(
            (data.conversation?.messages ?? []).map(
              (m: { role: string; content: string }) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content,
              })
            )
          );
          setModel(resolveModel(data.conversation?.model));
        }
        setLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // Batalkan stream yang masih jalan kalau komponen dilepas.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // Auto-scroll ke bawah
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  // Hentikan generasi. Teks yang sudah masuk tetap dipertahankan — server juga
  // sudah menyimpan dan menagih bagian itu.
  function handleStop() {
    abortRef.current?.abort();
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setSending(true);
    setInput("");
    requestAnimationFrame(resizeTextarea);

    const controller = new AbortController();
    abortRef.current = controller;
    let streamStarted = false;

    try {
      // Buat conversation baru bila belum ada
      let convId = conversationId;
      if (!convId) {
        const res = await fetch("/api/conversations", {
          method: "POST",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Gagal membuat percakapan baru");
        const data = await res.json();
        convId = data.conversation.id as string;
      }

      setMessages((prev) => [
        ...prev,
        { role: "user", content: text },
        { role: "assistant", content: "" },
      ]);

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: text, model }),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Buang bubble assistant kosong + kembalikan pesan user ke input
        setMessages((prev) => prev.slice(0, -2));
        setInput(text);
        const data = await res.json().catch(() => ({}));
        if (res.status === 402) {
          setShowTopup(true);
          if (data.error) setError(data.error);
        } else {
          setError(data.error ?? `Terjadi kesalahan (${res.status})`);
        }
        return;
      }

      // Streaming response real-time
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        streamStarted = true;
        let acc = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          acc += decoder.decode(value, { stream: true });
          const current = acc;
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: current };
            return next;
          });
        }
      }

      // Pindah ke URL percakapan bila ini chat baru
      if (!conversationId && convId) {
        router.push(`/dashboard/chat/${convId}`);
      }
      // Segarkan saldo di TopBar dan daftar percakapan di sidebar.
      router.refresh();
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        // Dihentikan user: pertahankan jawaban parsial, jangan tampilkan error.
        router.refresh();
      } else {
        setError((err as Error).message || "Koneksi terputus. Coba lagi.");
        if (!streamStarted) setInput(text);
      }
      setMessages((prev) =>
        prev.length && prev[prev.length - 1].content === ""
          ? prev.slice(0, -1)
          : prev
      );
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-full flex-col">
      {showTopup && <TopupModal onClose={() => setShowTopup(false)} />}

      {/* Area pesan */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto max-w-3xl space-y-4">
          {loadingHistory ? (
            <p className="pt-20 text-center text-sm text-zinc-500">
              Memuat percakapan...
            </p>
          ) : messages.length === 0 ? (
            <div className="pt-24 text-center">
              <div className="text-4xl">💬</div>
              <h2 className="mt-4 text-xl font-semibold">Mulai percakapan baru</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Tanyakan apa saja ke Claude. Saldo hanya terpotong sesuai token
                yang dipakai.
              </p>
            </div>
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={i}
                role={m.role}
                content={
                  m.content || (m.role === "assistant" && sending ? "▍" : m.content)
                }
                streaming={sending && i === messages.length - 1}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-4">
        <div className="mx-auto max-w-3xl">
          {error && (
            <p className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}
          <div className="flex items-end gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 p-2 focus-within:border-orange-400">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                resizeTextarea();
              }}
              onKeyDown={handleKeyDown}
              maxLength={4000}
              placeholder="Ketik pesan... (Enter untuk kirim, Shift+Enter untuk baris baru)"
              className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-zinc-600"
            />
            {sending ? (
              <button
                onClick={handleStop}
                title="Hentikan generasi"
                className="rounded-xl border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-40"
              >
                Kirim
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <ModelPicker value={model} onChange={setModel} disabled={sending} />
            <span className="text-xs text-zinc-600">{input.length}/4000 karakter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
