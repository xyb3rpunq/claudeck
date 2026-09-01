import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, creditBalance: true },
  });
  if (!user) redirect("/login");

  return (
    <DashboardShell email={user.email} creditBalance={user.creditBalance}>
      {children}
    </DashboardShell>
  );
}
