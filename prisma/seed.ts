/**
 * Database seed.
 *
 * Idempotent: safe to run repeatedly. Seeds:
 *   1. The three built-in roles (Project Manager / Project Lead / Viewer),
 *      which are just pre-seeded rows in the data-driven role system.
 *   2. The Settings singleton (red-flag thresholds + submission deadline).
 *   3. A default set of notification rules.
 *   4. The PM admin user (from PM_ADMIN_EMAIL), pre-activated with the PM role.
 *   5. Optional demo data when SEED_DEMO=true (one project, milestones, etc.).
 *
 * Run with: `pnpm db:seed`
 */
import { PrismaClient, Permission, TriggerType, RecipientGroup, Channel } from "@prisma/client";

const prisma = new PrismaClient();

// Permission bundles for the three built-in roles. Custom roles built by the PM
// are simply different combinations of these same flags.
const ALL_PERMISSIONS = Object.values(Permission);

const LEAD_PERMISSIONS: Permission[] = [
  Permission.VIEW_ALL_PROJECTS, // leads can read all projects...
  Permission.EDIT_OWN_PROJECT, // ...but edit only their own
  Permission.SUBMIT_STATUS_UPDATES,
  Permission.CLOSE_ACTION_ITEMS, // can close action items assigned to them
];

const VIEWER_PERMISSIONS: Permission[] = [Permission.VIEW_ALL_PROJECTS];

async function seedRoles() {
  const roles: { name: string; description: string; permissions: Permission[] }[] = [
    {
      name: "Project Manager",
      description:
        "Full administrative access: manage projects, milestones, users, roles, notifications, and post-meeting tracking.",
      permissions: ALL_PERMISSIONS,
    },
    {
      name: "Project Lead",
      description:
        "Submit pre-meeting status updates for own project(s); view all projects (read-only on others).",
      permissions: LEAD_PERMISSIONS,
    },
    {
      name: "Viewer",
      description: "Read-only access across projects. No editing or submissions.",
      permissions: VIEWER_PERMISSIONS,
    },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { name: r.name },
      // Keep built-in permission sets authoritative on re-seed.
      update: { description: r.description, permissions: r.permissions, isBuiltIn: true },
      create: { ...r, isBuiltIn: true },
    });
  }
  console.log(`✓ Seeded ${roles.length} built-in roles`);
}

async function seedSettings() {
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" }, // defaults defined in schema
  });
  console.log("✓ Settings singleton ready");
}

async function seedNotificationRules() {
  const rules: {
    name: string;
    triggerType: TriggerType;
    recipients: RecipientGroup;
    channel: Channel;
    thresholdHours: number | null;
  }[] = [
    {
      name: "Remind leads 24h before meeting if no submission",
      triggerType: TriggerType.MISSING_SUBMISSION,
      recipients: RecipientGroup.PROJECT_LEADS,
      channel: Channel.BOTH,
      thresholdHours: 24,
    },
    {
      name: "Notify owner 48h before an action item is due",
      triggerType: TriggerType.ACTION_ITEM_DUE,
      recipients: RecipientGroup.ACTION_OWNER,
      channel: Channel.BOTH,
      thresholdHours: 48,
    },
    {
      name: "Notify PM when a project trips the Behind flag",
      triggerType: TriggerType.PROJECT_BEHIND,
      recipients: RecipientGroup.PM,
      channel: Channel.BOTH,
      thresholdHours: null,
    },
  ];

  // Only create defaults if no rules exist yet (don't clobber PM edits on re-seed).
  const count = await prisma.notificationRule.count();
  if (count === 0) {
    await prisma.notificationRule.createMany({ data: rules });
    console.log(`✓ Seeded ${rules.length} default notification rules`);
  } else {
    console.log("• Notification rules already present, skipping defaults");
  }
}

async function seedPmAdmin() {
  const email = process.env.PM_ADMIN_EMAIL?.toLowerCase().trim();
  if (!email) {
    console.warn("⚠ PM_ADMIN_EMAIL not set — skipping PM admin seed.");
    return;
  }
  const pmRole = await prisma.role.findUnique({ where: { name: "Project Manager" } });
  if (!pmRole) throw new Error("Project Manager role missing — seed roles first.");

  await prisma.user.upsert({
    where: { email },
    update: { status: "ACTIVE", roleId: pmRole.id },
    create: { email, name: "Project Manager", status: "ACTIVE", roleId: pmRole.id },
  });
  console.log(`✓ PM admin ready: ${email}`);
}

async function seedDemo() {
  if (process.env.SEED_DEMO !== "true") return;

  const leadRole = await prisma.role.findUnique({ where: { name: "Project Lead" } });
  const lead = await prisma.user.upsert({
    where: { email: "demo-lead@scarletmail.rutgers.edu" },
    update: {},
    create: {
      email: "demo-lead@scarletmail.rutgers.edu",
      name: "Demo Lead",
      status: "ACTIVE",
      roleId: leadRole?.id,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Campus Solar Garden",
      description: "Install a small solar array and native pollinator garden behind the engineering building.",
      semester: "Fall 2026",
      status: "ON_TRACK",
      assignments: { create: { userId: lead.id } },
      milestones: {
        create: [
          { title: "Secure faculty sponsor", targetDate: new Date("2026-09-15"), completed: true, completedDate: new Date("2026-09-10") },
          { title: "Finalize site permit", targetDate: new Date("2026-10-01") },
          { title: "Order panels", targetDate: new Date("2026-10-20") },
        ],
      },
    },
  });
  console.log(`✓ Demo project created: ${project.name}`);
}

async function main() {
  await seedRoles();
  await seedSettings();
  await seedNotificationRules();
  await seedPmAdmin();
  await seedDemo();
}

main()
  .then(() => console.log("Seed complete."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
