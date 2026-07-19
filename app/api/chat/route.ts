// STEP 3 — Wrapper API ke Claude (backend proxy, streaming)
// PENTING: ANTHROPIC_API_KEY hanya dibaca server-side dari environment variable
// dan TIDAK PERNAH dikirim/ter-expose ke client.

import Anthropic from "@anthropic-ai/sdk";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateCost } from "@/lib/pricing";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger, logTokenUsage } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

// STEP 7 — validasi input dengan zod (max 4000 karakter)
const chatSchema = z.object({
  conversationId: z.string().min(1),
  message: z.string().min(1, "Pesan tidak boleh kosong").max(4000, "Pesan maksimal 4000 karakter"),
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
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: history,
      stream: true,
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    logger.error("anthropic_api_error", {
      userId,
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

        for await (const event of anthropicStream) {
          if (event.type === "message_start") {
            inputTokens = event.message.usage.input_tokens;
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

        // 5 & 6. Hitung cost dan potong saldo
        const cost = calculateCost(inputTokens, outputTokens);
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
              tokensUsed: inputTokens,
            },
            {
              conversationId,
              role: "assistant",
              content: assistantText,
              tokensUsed: outputTokens,
            },
          ],
        });

        // Auto-title percakapan baru dari pesan pertama
        if (conversation.messages.length === 0) {
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title: message.slice(0, 60) },
          });
        }

        logTokenUsage(userId, inputTokens, outputTokens);
        controller.close();
      } catch (err) {
        // STEP 10 — log error dari Anthropic API (rate limit, invalid key, dsb)
        const e = err as { status?: number; message?: string };
        logger.error("anthropic_api_error", {
          userId,
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
