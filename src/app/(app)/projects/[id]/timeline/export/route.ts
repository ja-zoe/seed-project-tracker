import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { canViewProject } from "@/lib/queries";
import { TIMELINE_STATUS_LABEL } from "@/lib/format";

export const runtime = "nodejs";

const fmt = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : "");

/**
 * Export a project's full semester timeline (deliverables + nested subtasks) as
 * a styled .xlsx workbook. Access mirrors the project's view permission.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user || user.status !== "ACTIVE") {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!(await canViewProject(user, id))) {
    return new Response("Not found", { status: 404 });
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      deliverables: {
        orderBy: { orderIndex: "asc" },
        include: {
          subtasks: {
            orderBy: { orderIndex: "asc" },
            include: { assignee: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });
  if (!project) return new Response("Not found", { status: 404 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "SEED Project Tracker";
  wb.created = new Date();

  const ws = wb.addWorksheet("Semester timeline", {
    views: [{ state: "frozen", ySplit: 3 }],
  });

  ws.columns = [
    { header: "Level", key: "level", width: 12 },
    { header: "Title", key: "title", width: 38 },
    { header: "Description", key: "description", width: 50 },
    { header: "Status", key: "status", width: 14 },
    { header: "Assignee", key: "assignee", width: 22 },
    { header: "Start", key: "start", width: 12 },
    { header: "Target / Due", key: "due", width: 14 },
  ];

  // Title rows (above the header row, which is row 3 thanks to the splice below).
  ws.spliceRows(1, 0, [`${project.name} — Semester timeline`], [`${project.semester}  ·  exported ${fmt(new Date())}`]);
  ws.mergeCells("A1:G1");
  ws.mergeCells("A2:G2");
  ws.getCell("A1").font = { size: 15, bold: true };
  ws.getCell("A2").font = { size: 10, color: { argb: "FF6B7280" } };

  const headerRow = ws.getRow(3);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF5F8A4E" } };
  headerRow.alignment = { vertical: "middle" };

  for (const d of project.deliverables) {
    const dRow = ws.addRow({
      level: "Deliverable",
      title: d.title,
      description: d.description ?? "",
      status: TIMELINE_STATUS_LABEL[d.status],
      assignee: "",
      start: fmt(d.startDate),
      due: fmt(d.targetDate),
    });
    dRow.font = { bold: true };
    dRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEDF1E4" } };

    for (const s of d.subtasks) {
      const sRow = ws.addRow({
        level: "  Subtask",
        title: `   ${s.title}`,
        description: s.description ?? "",
        status: TIMELINE_STATUS_LABEL[s.status],
        assignee: s.assignee ? (s.assignee.name ?? s.assignee.email) : "Unassigned",
        start: fmt(s.startDate),
        due: fmt(s.dueDate),
      });
      sRow.getCell("title").alignment = { indent: 1 };
    }
  }

  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n >= 3) row.alignment = { ...row.alignment, wrapText: true, vertical: "top" };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const safeName = project.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "project";

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeName}-timeline.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
