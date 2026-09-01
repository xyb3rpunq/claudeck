import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Ambil detail + messages sebuah percakapan. */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
    select: {
      id: true,
      title: true,
      model: true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, model: true, createdAt: true },
      },
    },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ conversation });
}

const patchSchema = z.object({
  title: z.string().trim().min(1, "Judul tidak boleh kosong").max(100),
});

/** Ganti judul percakapan. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
      { status: 400 }
    );
  }

  // updateMany + filter userId sekaligus jadi cek kepemilikan: percakapan milik
  // user lain tidak akan tersentuh.
  const result = await prisma.conversation.updateMany({
    where: { id: params.id, userId },
    data: { title: parsed.data.title },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, title: parsed.data.title });
}

/** Hapus percakapan. */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await prisma.conversation.deleteMany({
    where: { id: params.id, userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
