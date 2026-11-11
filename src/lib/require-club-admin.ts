import { auth } from "./auth";
import { prisma } from "./prisma";
import { notFound } from "next/navigation";

export async function requireClubAdmin(clubId: string) {
  const session = await auth();
  if (!session?.user?.id) notFound();

  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId: session.user.id } },
  });

  if (!membership || (membership.role !== "ADMIN" && membership.role !== "CREATOR")) {
    notFound();
  }

  return { user: session.user, membership };
}
