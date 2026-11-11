import { beforeEach, describe, expect, mock, test } from "bun:test";

const auth = mock();
const findUnique = mock();
const notFound = mock(() => {
  throw new Error("NEXT_NOT_FOUND");
});

mock.module("./auth", () => ({ auth }));
mock.module("./prisma", () => ({ prisma: { clubMembership: { findUnique } } }));
mock.module("next/navigation", () => ({ notFound }));

const { requireClubAdmin } = await import("./require-club-admin");

beforeEach(() => {
  auth.mockReset();
  findUnique.mockReset();
  notFound.mockClear();
  auth.mockResolvedValue({ user: { id: "viewer" } });
});

describe("requireClubAdmin", () => {
  for (const session of [null, {}, { user: {} }]) {
    test(`denies missing identity: ${JSON.stringify(session)}`, async () => {
      auth.mockResolvedValue(session);
      await expect(requireClubAdmin("club-a")).rejects.toThrow("NEXT_NOT_FOUND");
      expect(findUnique).not.toHaveBeenCalled();
    });
  }

  for (const membership of [null, { role: "STUDENT" }, { role: "UNKNOWN" }]) {
    test(`denies unauthorized membership: ${JSON.stringify(membership)}`, async () => {
      findUnique.mockResolvedValue(membership);
      await expect(requireClubAdmin("club-a")).rejects.toThrow("NEXT_NOT_FOUND");
      expect(findUnique).toHaveBeenCalledWith({
        where: { clubId_userId: { clubId: "club-a", userId: "viewer" } },
      });
    });
  }

  for (const role of ["ADMIN", "CREATOR"]) {
    test(`allows ${role} and returns authorized identity and membership`, async () => {
      const membership = { role, clubId: "club-a", userId: "viewer" };
      findUnique.mockResolvedValue(membership);
      expect(await requireClubAdmin("club-a")).toEqual({
        user: { id: "viewer" },
        membership,
      });
      expect(notFound).not.toHaveBeenCalled();
    });
  }

  test("does not reuse authorization from another club", async () => {
    findUnique.mockImplementation(async ({ where }) =>
      where.clubId_userId.clubId === "club-a" ? { role: "ADMIN" } : null,
    );
    await requireClubAdmin("club-a");
    await expect(requireClubAdmin("club-b")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  test("fails closed on membership query errors", async () => {
    findUnique.mockRejectedValue(new Error("database unavailable"));
    await expect(requireClubAdmin("club-a")).rejects.toThrow("database unavailable");
  });
});
