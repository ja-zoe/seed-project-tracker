import { Channel, NotificationType, type RecipientGroup } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Notification delivery — in-app (always) and email (via Resend, optional).
 *
 * Email is best-effort: if RESEND_API_KEY is unset we silently skip it so the
 * app stays fully usable without configuring email (in-app still works).
 */

type Payload = {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
};

/** Create an in-app notification (the bell). */
export async function createInApp(userId: string, p: Payload) {
  await prisma.notification.create({
    data: { userId, type: p.type, title: p.title, body: p.body, link: p.link },
  });
}

/** Send one email through Resend. No-ops (returns false) if email isn't configured. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    // Imported lazily so the dependency isn't pulled into bundles that never email.
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "SEED Tracker <onboarding@resend.dev>",
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[notify] email send failed:", err);
    return false;
  }
}

/** Minimal branded email wrapper so messages look consistent. */
function emailHtml(title: string, body: string, link?: string): string {
  const cta = link
    ? `<p style="margin-top:24px"><a href="${link}" style="background:#3a5a40;color:#fff;padding:10px 18px;border-radius:12px;text-decoration:none;font-family:sans-serif">Open SEED Tracker</a></p>`
    : "";
  return `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#2b2b26">
    <h2 style="color:#3a5a40">${title}</h2>
    <p style="line-height:1.6;color:#545049">${body}</p>${cta}
    <hr style="border:none;border-top:1px solid #e3e0d7;margin:24px 0" />
    <p style="font-size:12px;color:#76726a">SEED Project Tracker · Students for Environmental and Energy Development</p>
  </div>`;
}

/**
 * Deliver a notification to a single user across the given channel(s).
 * Builds the absolute link for emails from AUTH_URL when available.
 */
export async function notifyUser(
  user: { id: string; email: string | null },
  channel: Channel,
  p: Payload,
) {
  const tasks: Promise<unknown>[] = [];
  if (channel === Channel.IN_APP || channel === Channel.BOTH) {
    tasks.push(createInApp(user.id, p));
  }
  if ((channel === Channel.EMAIL || channel === Channel.BOTH) && user.email) {
    const base = process.env.AUTH_URL ?? "";
    const absLink = p.link ? `${base}${p.link}` : undefined;
    tasks.push(sendEmail(user.email, p.title, emailHtml(p.title, p.body ?? "", absLink)));
  }
  await Promise.all(tasks);
}

/**
 * Resolve a RecipientGroup to concrete active users for a given context
 * (project leads, the action-item owner, etc.).
 */
export async function resolveRecipients(
  group: RecipientGroup,
  ctx: { projectId?: string; ownerId?: string | null } = {},
): Promise<{ id: string; email: string | null }[]> {
  switch (group) {
    case "PM":
      return prisma.user.findMany({
        where: { status: "ACTIVE", role: { permissions: { has: "MANAGE_PROJECTS" } } },
        select: { id: true, email: true },
      });
    case "PROJECT_LEADS":
      if (!ctx.projectId) return [];
      return prisma.user.findMany({
        where: { status: "ACTIVE", assignments: { some: { projectId: ctx.projectId } } },
        select: { id: true, email: true },
      });
    case "ACTION_OWNER":
      if (!ctx.ownerId) return [];
      return prisma.user.findMany({
        where: { status: "ACTIVE", id: ctx.ownerId },
        select: { id: true, email: true },
      });
    case "ALL_ACTIVE":
      return prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true, email: true } });
    default:
      return [];
  }
}
