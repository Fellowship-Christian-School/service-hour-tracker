import { joinClub } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function JoinClubPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const club = await prisma.club.findUnique({
    where: { inviteToken: token },
  });

  if (!club) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invalid Link</h1>
          <p className="mt-2 text-sm text-gray-500">
            This invite link is no longer valid. Ask the club creator for a new one.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  const joinWithToken = joinClub.bind(null, token);

  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4 text-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Join {club.name}</h1>
          {club.description && (
            <p className="mt-2 text-sm text-gray-500">{club.description}</p>
          )}
        </div>

        <form action={joinWithToken}>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Join Club
          </button>
        </form>
      </div>
    </div>
  );
}
