import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
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

/** Hapus percakapan. */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const conversation = await prisma.conversation.findFirst({
    where: { id: params.id, userId },
    select: { id: true },
  });
  if (!conversation) {
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
  }

  await prisma.conversation.delete({ where: { id: conversation.id } });
  return NextResponse.json({ ok: true });
}
