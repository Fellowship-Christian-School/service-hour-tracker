import { prisma } from "@/lib/prisma";
import { requireClubAdmin } from "@/lib/require-club-admin";
import { StatusBadge } from "@/components/ui/badge";
import { FlagPill } from "@/components/flag-pill";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { approveHour, rejectHour, bulkApproveHours } from "@/lib/actions";
import { InboxTable } from "@/components/inbox-table";
import Link from "next/link";

export default async function ReviewInboxPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
    student?: string;
    sort?: string;
    page?: string;
    flag?: string;
  }>;
}) {
  const { id: clubId } = await params;
  await requireClubAdmin(clubId);
  const {
    status = "PENDING",
    student,
    sort = "date-desc",
    page: pageStr,
    flag: flagFilter,
  } = await searchParams;

  const page = Math.max(1, parseInt(pageStr || "1"));
  const pageSize = 25;

  // Load flags for filter pills
  const flags = await prisma.flag.findMany({
    where: { clubId },
    orderBy: { name: "asc" },
  });

  const where: Record<string, unknown> = { clubId };
  if (status && status !== "all") where.status = status;
  if (student) where.student = { name: { contains: student, mode: "insensitive" } };
  if (flagFilter && flagFilter !== "all") {
    // Only include hours where the student has a membership with this flag (within this club).
    where.student = {
      ...(where.student as object || {}),
      memberships: {
        some: {
          clubId,
          flags: { some: { flagId: flagFilter } },
        },
      },
    };
  }

  const orderBy: Record<string, string> = {};
  if (sort === "hours") orderBy.hours = "desc";
  else if (sort === "student") orderBy.studentId = "asc";
  else orderBy.createdAt = "desc";

  const [submissions, total] = await Promise.all([
    prisma.serviceHour.findMany({
      where,
      include: { student: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.serviceHour.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  // Serialize for client component
  const serialized = submissions.map((s) => ({
    id: s.id,
    activityName: s.activityName,
    date: s.date.toISOString(),
    hours: Number(s.hours),
    status: s.status,
    description: s.description,
    studentName: s.student.name,
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900">Review Inbox</h1>

      {/* Status Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        {["PENDING", "APPROVED", "REJECTED", "all"].map((s) => {
          const params = new URLSearchParams({ status: s, sort });
          if (flagFilter) params.set("flag", flagFilter);
          return (
            <Link
              key={s}
              href={`/club/${clubId}/admin/inbox?${params.toString()}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                status === s
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          );
        })}
      </div>

      {/* Flag Filters */}
      {flags.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Flag:</span>
          <Link
            href={`/club/${clubId}/admin/inbox?status=${status}&sort=${sort}`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              !flagFilter || flagFilter === "all"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All Students
          </Link>
          {flags.map((f) => {
            const params = new URLSearchParams({ status, sort, flag: f.id });
            const active = flagFilter === f.id;
            return (
              <Link
                key={f.id}
                href={`/club/${clubId}/admin/inbox?${params.toString()}`}
                className={active ? "ring-2 ring-offset-1 ring-gray-700 rounded-full" : ""}
              >
                <FlagPill name={f.name} color={f.color} />
              </Link>
            );
          })}
        </div>
      )}

      {submissions.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No submissions found" />
        </div>
      ) : (
        <>
          {status === "PENDING" ? (
            <InboxTable
              submissions={serialized}
              clubId={clubId}
              onApprove={approveHour}
              onReject={rejectHour}
              onBulkApprove={bulkApproveHours}
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="mt-4 hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Activity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Hours</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {submissions.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-3 text-sm text-gray-900">{s.student.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{s.activityName}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(s.date)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{Number(s.hours)}</td>
                        <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile cards */}
              <div className="mt-4 space-y-3 sm:hidden">
                {submissions.map((s) => (
                  <div key={s.id} className="rounded-lg border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{s.student.name}</p>
                      <StatusBadge status={s.status} />
                    </div>
                    <p className="mt-1 text-sm text-gray-900">{s.activityName}</p>
                    <div className="mt-1 flex gap-3 text-xs text-gray-500">
                      <span>{formatDate(s.date)}</span>
                      <span>{Number(s.hours)} hrs</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {totalPages > 1 && (() => {
            const baseParams = new URLSearchParams({ status, sort });
            if (flagFilter) baseParams.set("flag", flagFilter);
            const prevParams = new URLSearchParams(baseParams);
            prevParams.set("page", String(page - 1));
            const nextParams = new URLSearchParams(baseParams);
            nextParams.set("page", String(page + 1));
            return (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={`/club/${clubId}/admin/inbox?${prevParams.toString()}`}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/club/${clubId}/admin/inbox?${nextParams.toString()}`}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
