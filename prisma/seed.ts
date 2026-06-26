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

// General members work *inside* a project: they see the project(s) they're
// assigned to (read-only) and act on the timeline subtasks / action items
// assigned to them. Visibility is scoped to their assignments, not the whole club.
const MEMBER_PERMISSIONS: Permission[] = [
  Permission.VIEW_ASSIGNED_PROJECTS,
  Permission.CLOSE_ACTION_ITEMS, // close action items they own
];

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
    {
      name: "General Member",
      description:
        "Works inside assigned project(s): read-only project view plus the timeline subtasks and action items assigned to them, which they can update.",
      permissions: MEMBER_PERMISSIONS,
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

  const memberRole = await prisma.role.findUnique({ where: { name: "General Member" } });
  const member = await prisma.user.upsert({
    where: { email: "demo-member@scarletmail.rutgers.edu" },
    update: {},
    create: {
      email: "demo-member@scarletmail.rutgers.edu",
      name: "Demo Member",
      status: "ACTIVE",
      roleId: memberRole?.id,
    },
  });

  const project = await prisma.project.create({
    data: {
      name: "Campus Solar Garden",
      description: "Install a small solar array and native pollinator garden behind the engineering building.",
      semester: "Fall 2026",
      status: "ON_TRACK",
      assignments: {
        create: [
          { userId: lead.id, role: "LEAD" },
          { userId: member.id, role: "MEMBER" },
        ],
      },
      deliverables: {
        create: [
          {
            title: "Secure faculty sponsor & funding",
            description: "Confirm a faculty advisor in the engineering department and secure the $4k materials budget through the SEED grant.",
            targetDate: new Date("2026-09-15"),
            status: "COMPLETE",
            completed: true,
            completedDate: new Date("2026-09-10"),
            orderIndex: 0,
          },
          {
            title: "Finalize site permit & electrical plan",
            description: "Obtain the facilities permit for the site behind the engineering building and a stamped electrical interconnection plan.",
            targetDate: new Date("2026-10-01"),
            status: "IN_PROGRESS",
            orderIndex: 1,
            subtasks: {
              create: [
                { title: "Draft single-line electrical diagram", description: "Panel → inverter → building tie-in, sized for a 3 kW array.", assigneeId: member.id, dueDate: new Date("2026-09-22"), status: "IN_PROGRESS", orderIndex: 0 },
                { title: "Submit facilities permit request", description: "File the dig/site-use permit with campus facilities.", assigneeId: lead.id, dueDate: new Date("2026-09-26"), status: "NOT_STARTED", orderIndex: 1 },
              ],
            },
          },
          {
            title: "Procure & install panels",
            description: "Order panels, racking, and inverter; schedule the install weekend with volunteers.",
            targetDate: new Date("2026-10-20"),
            status: "NOT_STARTED",
            orderIndex: 2,
          },
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
