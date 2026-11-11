import { auth } from "@/lib/auth";
import { csvRow } from "@/lib/csv";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: clubId } = await params;

  // Verify admin access
  const membership = await prisma.clubMembership.findUnique({
    where: { clubId_userId: { clubId, userId: session.user.id } },
    select: { role: true },
  });
  if (!membership || (membership.role !== "ADMIN" && membership.role !== "CREATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const studentId = request.nextUrl.searchParams.get("student");

  if (studentId) {
    // Export individual student's hours
    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { name: true },
    });
    const hours = await prisma.serviceHour.findMany({
      where: { clubId, studentId },
      orderBy: { date: "desc" },
      select: {
        activityName: true,
        date: true,
        hours: true,
        status: true,
        description: true,
        rejectReason: true,
      },
    });

    const csv = [
      csvRow(["Activity", "Date", "Hours", "Status", "Description", "Reject Reason"]),
      ...hours.map((h) =>
        csvRow([
          h.activityName,
          new Date(h.date).toISOString().split("T")[0],
          Number(h.hours),
          h.status,
          h.description,
          h.rejectReason,
        ])
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${(student?.name || "student").replace(/"/g, "")}_hours.csv"`,
      },
    });
  } else {
    // Optional ?flag=<flagId> to scope export to members with a specific flag
    const flagFilter = request.nextUrl.searchParams.get("flag");

    const members = await prisma.clubMembership.findMany({
      where: {
        clubId,
        ...(flagFilter
          ? { flags: { some: { flagId: flagFilter } } }
          : {}),
      },
      select: {
        userId: true,
        role: true,
        user: { select: { name: true, email: true } },
        flags: { select: { flag: { select: { name: true } } } },
      },
    });

    const hoursByStudent = await prisma.serviceHour.groupBy({
      by: ["studentId"],
      where: { clubId, status: "APPROVED" },
      _sum: { hours: true },
    });
    const hoursMap = Object.fromEntries(
      hoursByStudent.map((h) => [h.studentId, Number(h._sum.hours || 0)])
    );

    const csv = [
      csvRow(["Name", "Email", "Role", "Flags", "Approved Hours"]),
      ...members.map((m) =>
        csvRow([
          m.user.name,
          m.user.email,
          m.role,
          m.flags.map((mf) => mf.flag.name).join("; "),
          hoursMap[m.userId] || 0,
        ])
      ),
    ].join("\n");

    const [club, flag] = await Promise.all([
      prisma.club.findUnique({ where: { id: clubId }, select: { name: true } }),
      flagFilter
        ? prisma.flag.findUnique({ where: { id: flagFilter }, select: { name: true } })
        : Promise.resolve(null),
    ]);

    const baseName = (club?.name || "club").replace(/"/g, "");
    const suffix = flag ? `_${flag.name.replace(/[^a-z0-9]+/gi, "_")}` : "";

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}${suffix}_roster.csv"`,
      },
    });
  }
}
