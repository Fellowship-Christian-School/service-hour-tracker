import { prisma } from "@/lib/prisma";
import { requireClubAdmin } from "@/lib/require-club-admin";
import Link from "next/link";
import { CopyInviteLink } from "@/components/copy-button";

export default async function AdminDashboard({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clubId } = await params;
  await requireClubAdmin(clubId);

  const [club, totalApproved, pendingCount, memberCount, monthlyHours] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubId } }),
    prisma.serviceHour.aggregate({
      where: { clubId, status: "APPROVED" },
      _sum: { hours: true },
    }),
    prisma.serviceHour.count({
      where: { clubId, status: "PENDING" },
    }),
    prisma.clubMembership.count({
      where: { clubId },
    }),
    // Get hours per month for the last 12 months
    prisma.$queryRaw<{ month: string; total: number }[]>`
      SELECT to_char(date, 'YYYY-MM') as month, CAST(SUM(hours) AS FLOAT) as total
      FROM service_hours
      WHERE club_id = ${clubId} AND status = 'APPROVED'
        AND date >= NOW() - INTERVAL '12 months'
      GROUP BY to_char(date, 'YYYY-MM')
      ORDER BY month ASC
    `,
  ]);

  const inviteUrl = club ? `${process.env.NEXTAUTH_URL}/join/${club.inviteToken}` : "";

  const totalHours = Number(totalApproved._sum.hours || 0);
  const maxMonthly = Math.max(...monthlyHours.map((m) => m.total), 1);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <p className="text-sm font-medium text-gray-500">Total Approved Hours</p>
          <p className="mt-1 text-3xl font-bold text-blue-600">{totalHours}</p>
        </div>
        <Link
          href={`/club/${clubId}/admin/inbox?status=PENDING`}
          className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md sm:p-6"
        >
          <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
          <p className="mt-1 text-3xl font-bold text-yellow-600">{pendingCount}</p>
        </Link>
        <Link
          href={`/club/${clubId}/admin/students`}
          className="rounded-xl border border-gray-200 bg-white p-5 transition-shadow hover:shadow-md sm:p-6"
        >
          <p className="text-sm font-medium text-gray-500">Members</p>
          <p className="mt-1 text-3xl font-bold text-gray-900">{memberCount}</p>
        </Link>
      </div>

      {/* Monthly Chart */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Hours by Month</h2>
        {monthlyHours.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No approved hours yet.</p>
        ) : (
          <div className="mt-4 flex items-end gap-2 overflow-x-auto" style={{ height: 200, minWidth: 0 }}>
            {monthlyHours.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-900">
                  {Math.round(m.total)}
                </span>
                <div
                  className="w-full rounded-t bg-blue-500"
                  style={{
                    height: `${(m.total / maxMonthly) * 160}px`,
                    minHeight: 4,
                  }}
                />
                <span className="text-xs text-gray-500">
                  {m.month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Link */}
      {club && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900">Invite Link</h2>
          <p className="mt-1 text-sm text-gray-500">
            Share this link to let new members join your club.
          </p>
          <div className="mt-3">
            <CopyInviteLink url={inviteUrl} />
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/club/${clubId}/admin/inbox`}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Review Inbox
        </Link>
        <Link
          href={`/club/${clubId}/admin/students`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Student Roster
        </Link>
        <Link
          href={`/club/${clubId}/admin/opportunities`}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Manage Opportunities
        </Link>
      </div>
    </div>
  );
}
