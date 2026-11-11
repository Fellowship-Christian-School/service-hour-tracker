import { prisma } from "@/lib/prisma";
import { requireClubAdmin } from "@/lib/require-club-admin";
import { StatusBadge } from "@/components/ui/badge";
import { FlagPill } from "@/components/flag-pill";
import { formatDate } from "@/lib/utils";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string; uid: string }>;
}) {
  const { id: clubId, uid } = await params;
  await requireClubAdmin(clubId);

  const [user, membership, hours, approvedSum] = await Promise.all([
    prisma.user.findUnique({ where: { id: uid } }),
    prisma.clubMembership.findUnique({
      where: { clubId_userId: { clubId, userId: uid } },
      include: { flags: { include: { flag: true } } },
    }),
    prisma.serviceHour.findMany({
      where: { clubId, studentId: uid },
      orderBy: { date: "desc" },
    }),
    prisma.serviceHour.aggregate({
      where: { clubId, studentId: uid, status: "APPROVED" },
      _sum: { hours: true },
    }),
  ]);

  if (!user || !membership) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/club/${clubId}/admin/students`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Back to Roster
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
          {membership.flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {membership.flags.map((mf) => (
                <FlagPill key={mf.flag.id} name={mf.flag.name} color={mf.flag.color} />
              ))}
            </div>
          )}
        </div>
        <div className="sm:text-right">
          <p className="text-sm text-gray-500">Approved Hours</p>
          <p className="text-3xl font-bold text-blue-600">
            {Number(approvedSum._sum.hours || 0)}
          </p>
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <a
          href={`/api/clubs/${clubId}/export?student=${uid}`}
          className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </a>
      </div>

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Activity</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {hours.map((h) => (
              <tr key={h.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{h.activityName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(h.date)}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{Number(h.hours)}</td>
                <td className="px-4 py-3"><StatusBadge status={h.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-500">{h.description || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {hours.map((h) => (
          <div key={h.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{h.activityName}</p>
              <StatusBadge status={h.status} />
            </div>
            <div className="mt-1 flex gap-3 text-xs text-gray-500">
              <span>{formatDate(h.date)}</span>
              <span>{Number(h.hours)} hrs</span>
            </div>
            {h.description && (
              <p className="mt-2 text-xs text-gray-500">{h.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
