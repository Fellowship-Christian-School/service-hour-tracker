import { requireClubAdmin } from "@/lib/require-club-admin";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/empty-state";
import {
  createOpportunity,
  deleteOpportunity,
  updateOpportunity,
} from "@/lib/actions";
import { OpportunityCard } from "@/components/opportunity-card";

export default async function ManageOpportunitiesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clubId } = await params;
  const { user } = await requireClubAdmin(clubId);
  const currentUserId = user.id;

  const opportunities = await prisma.opportunity.findMany({
    where: { clubId },
    orderBy: { date: "desc" },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = opportunities.filter((o) => new Date(o.date) >= today);
  const past = opportunities.filter((o) => new Date(o.date) < today);

  const createOpp = createOpportunity.bind(null, clubId);

  function serialize(o: (typeof opportunities)[number]) {
    return {
      id: o.id,
      name: o.name,
      description: o.description,
      date: o.date.toISOString(),
      createdBy: o.createdBy,
    };
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Manage Opportunities</h1>

      {/* Create Form */}
      <form
        action={createOpp}
        className="mt-6 rounded-lg border border-gray-200 bg-white p-5"
      >
        <h2 className="font-semibold text-gray-900">Create Opportunity</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <input
              name="name"
              type="text"
              required
              placeholder="Opportunity name"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <input
              name="date"
              type="date"
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <textarea
              name="description"
              required
              rows={2}
              placeholder="Description: location, expectations, etc."
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          type="submit"
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create
        </button>
      </form>

      {/* Active Opportunities */}
      {upcoming.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-gray-900">Upcoming</h2>
          <div className="mt-3 space-y-3">
            {upcoming.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={serialize(opp)}
                clubId={clubId}
                canEdit={opp.createdBy === currentUserId}
                past={false}
                onUpdate={updateOpportunity}
                onDelete={deleteOpportunity}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Opportunities */}
      {past.length > 0 && (
        <div className="mt-6">
          <h2 className="font-semibold text-gray-500">Archived</h2>
          <div className="mt-3 space-y-3">
            {past.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opp={serialize(opp)}
                clubId={clubId}
                canEdit={opp.createdBy === currentUserId}
                past={true}
                onUpdate={updateOpportunity}
                onDelete={deleteOpportunity}
              />
            ))}
          </div>
        </div>
      )}

      {opportunities.length === 0 && (
        <div className="mt-6">
          <EmptyState title="No opportunities yet" description="Create one above." />
        </div>
      )}
    </div>
  );
}
