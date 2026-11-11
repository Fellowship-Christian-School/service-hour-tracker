import { requireClubAdmin } from "@/lib/require-club-admin";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { FlagPill } from "@/components/flag-pill";
import {
  removeMember,
  promoteToAdmin,
  demoteToStudent,
  createFlag,
  deleteFlag,
  assignFlag,
  unassignFlag,
} from "@/lib/actions";
import { FlagManager } from "@/components/flag-manager";
import { MemberFlags } from "@/components/member-flags";
import Link from "next/link";

export default async function StudentRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ flag?: string }>;
}) {
  const { id: clubId } = await params;
  const { membership: currentMembership } = await requireClubAdmin(clubId);
  const { flag: flagFilter } = await searchParams;
  const isCreator = currentMembership.role === "CREATOR";

  const [members, flags] = await Promise.all([
    prisma.clubMembership.findMany({
      where: {
        clubId,
        ...(flagFilter && flagFilter !== "all"
          ? { flags: { some: { flagId: flagFilter } } }
          : {}),
      },
      include: {
        user: true,
        flags: { include: { flag: true } },
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.flag.findMany({
      where: { clubId },
      orderBy: { name: "asc" },
    }),
  ]);

  // Get approved hours per student
  const hoursByStudent = await prisma.serviceHour.groupBy({
    by: ["studentId"],
    where: { clubId, status: "APPROVED" },
    _sum: { hours: true },
  });
  const hoursMap = Object.fromEntries(
    hoursByStudent.map((h) => [h.studentId, Number(h._sum.hours || 0)]),
  );

  const flagsForUI = flags.map((f) => ({ id: f.id, name: f.name, color: f.color }));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Student Roster</h1>
        <ExportButton clubId={clubId} flagFilter={flagFilter} />
      </div>

      {/* Flag management */}
      <div className="mt-4">
        <FlagManager
          clubId={clubId}
          flags={flagsForUI}
          onCreate={createFlag}
          onDelete={deleteFlag}
        />
      </div>

      {/* Flag filter */}
      {flags.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Filter:</span>
          <Link
            href={`/club/${clubId}/admin/students`}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              !flagFilter || flagFilter === "all"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </Link>
          {flags.map((f) => (
            <Link
              key={f.id}
              href={`/club/${clubId}/admin/students?flag=${f.id}`}
              className={flagFilter === f.id ? "ring-2 ring-offset-1 ring-gray-700 rounded-full" : ""}
            >
              <FlagPill name={f.name} color={f.color} />
            </Link>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div className="mt-6 hidden overflow-x-auto rounded-lg border border-gray-200 bg-white sm:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Flags</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Hours</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {members.map((m) => {
              const assignedFlags = m.flags.map((mf) => ({
                id: mf.flag.id,
                name: mf.flag.name,
                color: mf.flag.color,
              }));
              return (
                <tr key={m.id}>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/club/${clubId}/admin/students/${m.userId}`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {m.user.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.user.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant={m.role === "CREATOR" ? "blue" : m.role === "ADMIN" ? "green" : "gray"}>
                      {m.role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <MemberFlags
                      clubId={clubId}
                      membershipId={m.id}
                      assigned={assignedFlags}
                      available={flagsForUI}
                      onAssign={assignFlag}
                      onUnassign={unassignFlag}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{hoursMap[m.userId] || 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {m.role === "STUDENT" && (
                        <>
                          {isCreator && (
                            <form action={async () => { "use server"; await promoteToAdmin(clubId, m.userId); }}>
                              <button className="text-xs font-medium text-blue-600 hover:text-blue-800">Promote</button>
                            </form>
                          )}
                          <form action={async () => { "use server"; await removeMember(clubId, m.userId); }}>
                            <button className="text-xs font-medium text-red-600 hover:text-red-800">Remove</button>
                          </form>
                        </>
                      )}
                      {m.role === "ADMIN" && isCreator && (
                        <form action={async () => { "use server"; await demoteToStudent(clubId, m.userId); }}>
                          <button className="text-xs font-medium text-yellow-600 hover:text-yellow-800">Demote</button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="mt-6 space-y-3 sm:hidden">
        {members.map((m) => {
          const assignedFlags = m.flags.map((mf) => ({
            id: mf.flag.id,
            name: mf.flag.name,
            color: mf.flag.color,
          }));
          return (
            <div key={m.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <Link
                  href={`/club/${clubId}/admin/students/${m.userId}`}
                  className="font-medium text-blue-600 hover:text-blue-800"
                >
                  {m.user.name}
                </Link>
                <Badge variant={m.role === "CREATOR" ? "blue" : m.role === "ADMIN" ? "green" : "gray"}>
                  {m.role}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-gray-500">{m.user.email}</p>
              <p className="mt-1 text-sm text-gray-900">{hoursMap[m.userId] || 0} approved hours</p>
              <div className="mt-2">
                <MemberFlags
                  clubId={clubId}
                  membershipId={m.id}
                  assigned={assignedFlags}
                  available={flagsForUI}
                  onAssign={assignFlag}
                  onUnassign={unassignFlag}
                />
              </div>
              <div className="mt-3 flex gap-3">
                {m.role === "STUDENT" && (
                  <>
                    {isCreator && (
                      <form action={async () => { "use server"; await promoteToAdmin(clubId, m.userId); }}>
                        <button className="text-xs font-medium text-blue-600 hover:text-blue-800">Promote</button>
                      </form>
                    )}
                    <form action={async () => { "use server"; await removeMember(clubId, m.userId); }}>
                      <button className="text-xs font-medium text-red-600 hover:text-red-800">Remove</button>
                    </form>
                  </>
                )}
                {m.role === "ADMIN" && isCreator && (
                  <form action={async () => { "use server"; await demoteToStudent(clubId, m.userId); }}>
                    <button className="text-xs font-medium text-yellow-600 hover:text-yellow-800">Demote</button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExportButton({ clubId, flagFilter }: { clubId: string; flagFilter?: string }) {
  const url = flagFilter && flagFilter !== "all"
    ? `/api/clubs/${clubId}/export?flag=${flagFilter}`
    : `/api/clubs/${clubId}/export`;
  return (
    <a
      href={url}
      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Export CSV
    </a>
  );
}
