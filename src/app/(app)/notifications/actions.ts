"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

/** Mark a single notification read (only if it belongs to the current user). */
export async function markRead(notificationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id },
    data: { read: true },
  });
  revalidatePath("/notifications");
}

/** Mark all of the current user's notifications read. */
export async function markAllRead() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/notifications");
}
