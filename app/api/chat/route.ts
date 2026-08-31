// STEP 3 — Wrapper API ke Claude (backend proxy, streaming)
// PENTING: ANTHROPIC_API_KEY hanya dibaca server-side dari environment variable
// dan TIDAK PERNAH dikirim/ter-expose ke client.

import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCost, MODELS, MODEL_IDS, resolveModel, type ModelId } from "@/lib/pricing";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger, logTokenUsage } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOKENS = 4096;

// Chat adalah beban latency-sensitive: effort "medium" memberi kualitas yang
// baik tanpa membakar token thinking seperti default "high".
const CHAT_EFFORT = "medium" as const;

// Prompt caching baru diaktifkan setelah percakapan punya riwayat, karena
// menulis cache berbiaya 1.25x sementara membacanya hanya 0.1x — menguntungkan
// hanya kalau prefix-nya benar-benar dipakai ulang di giliran berikutnya.
const CACHE_MIN_HISTORY_MESSAGES = 2;

// STEP 7 — validasi input dengan zod (max 4000 karakter)
const chatSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1, "Pesan tidak boleh kosong").max(4000, "Pesan maksimal 4000 karakter"),
  model: z.enum(MODEL_IDS).optional(),
});

export async function POST(req: Request) {
  // 1. Auth
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 20 request/menit per user
  const rl = checkRateLimit(userId);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak request. Coba lagi sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  // Validasi input
  const body = await req.json().catch(() => null);
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }
  const { conversationId, message } = parsed.data;

  // 2. Cek saldo kredit
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 401 });
  }
  if (user.creditBalance <= 0) {
    return NextResponse.json(
      { error: "Saldo kredit habis. Silakan top-up untuk melanjutkan." },
      { status: 402 }
    );
  }

  // 3. Ambil history + pastikan conversation milik user
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Percakapan tidak ditemukan" }, { status: 404 });
  }

  // Model: pilihan dari request menang, jatuh ke model tersimpan percakapan.
  const model: ModelId = resolveModel(parsed.data.model ?? conversation.model);
  const spec = MODELS[model];

  if (!process.env.ANTHROPIC_API_KEY) {
    logger.error("anthropic_key_missing", { userId });
    return NextResponse.json(
      { error: "Layanan AI belum dikonfigurasi (ANTHROPIC_API_KEY kosong)." },
      { status: 503 }
    );
  }

  const history: Anthropic.MessageParam[] = conversation.messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }));
  history.push({ role: "user", content: message });

  // 4. Panggil Anthropic API dengan streaming.
  // Pakai create({stream:true}) agar error upstream (invalid key, kredit API
  // habis, rate limit Anthropic) terjadi SEBELUM response stream dimulai,
  // sehingga bisa dikembalikan sebagai JSON error yang jelas ke frontend.
  const client = new Anthropic();
  const encoder = new TextEncoder();

  let anthropicStream: AsyncIterable<Anthropic.RawMessageStreamEvent>;
  try {
    anthropicStream = await client.messages.create({
      model,
      max_tokens: MAX_TOKENS,
      messages: history,
      stream: true,
      ...(conversation.messages.length >= CACHE_MIN_HISTORY_MESSAGES
        ? { cache_control: { type: "ephemeral" as const } }
        : {}),
      ...(spec.supportsEffort ? { output_config: { effort: CHAT_EFFORT } } : {}),
      ...(spec.supportsAdaptiveThinking
        ? { thinking: { type: "adaptive" as const, display: "omitted" as const } }
        : {}),
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    logger.error("anthropic_api_error", {
      userId,
      model,
      status: e.status,
      message: e.message,
    });
    const friendly =
      e.message?.includes("credit balance") ?? false
        ? "Layanan AI sementara tidak tersedia (kredit API penyedia habis). Silakan hubungi admin."
        : e.status === 429
          ? "Layanan AI sedang sibuk. Coba lagi beberapa saat."
          : "Gagal menghubungi layanan AI. Coba lagi nanti.";
    return NextResponse.json({ error: friendly }, { status: 502 });
  }

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let assistantText = "";
        let inputTokens = 0;
        let outputTokens = 0;
        let cacheReadTokens = 0;
        let cacheWriteTokens = 0;

        for await (const event of anthropicStream) {
          if (event.type === "message_start") {
            const usage = event.message.usage;
            inputTokens = usage.input_tokens;
            cacheReadTokens = usage.cache_read_input_tokens ?? 0;
            cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
          } else if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            assistantText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          } else if (event.type === "message_delta") {
            outputTokens = event.usage.output_tokens;
          }
        }

        // 5 & 6. Hitung cost per-model (input/output/cache terpisah) dan potong saldo
        const cost = calculateCost(model, {
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
        });
        await prisma.user.update({
          where: { id: userId },
          data: { creditBalance: { decrement: cost } },
        });

        // 7. Simpan message user + assistant
        await prisma.message.createMany({
          data: [
            {
              conversationId,
              role: "user",
              content: message,
              tokensUsed: inputTokens + cacheReadTokens + cacheWriteTokens,
            },
            {
              conversationId,
              role: "assistant",
              content: assistantText,
              tokensUsed: outputTokens,
              model,
              costRp: cost,
            },
          ],
        });

        // Simpan model terpilih + auto-title percakapan baru dari pesan pertama
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            model,
            ...(conversation.messages.length === 0
              ? { title: message.slice(0, 60) }
              : {}),
          },
        });

        logTokenUsage(userId, {
          model,
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
          costRp: cost,
        });
        controller.close();
      } catch (err) {
        // STEP 10 — log error dari Anthropic API (rate limit, invalid key, dsb)
        const e = err as { status?: number; message?: string };
        logger.error("anthropic_stream_error", {
          userId,
          model,
          status: e.status,
          message: e.message,
        });
        controller.error(err);
      }
    },
  });

  // 8. Return response sebagai stream ke frontend
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
