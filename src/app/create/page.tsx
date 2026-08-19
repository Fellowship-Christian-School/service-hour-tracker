import { createClub } from "@/lib/actions";
import Link from "next/link";

export default function CreateClubPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900">Create a New Club</h1>
      <p className="mt-1 text-sm text-gray-500">
        You&apos;ll become the Creator with full management permissions.
      </p>

      <form action={createClub} className="mt-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Club Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. BETA Club"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="What is this club about?"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Club
          </button>
        </div>
      </form>
    </div>
  );
}
