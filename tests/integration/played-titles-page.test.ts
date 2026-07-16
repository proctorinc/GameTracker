import { afterEach, describe, expect, it, vi } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { createGameFixture } from "../fixtures/games";
import { withTestDatabase } from "../helpers/test-db";

function mockAuthenticatedUser(userId: string) {
  vi.doMock("@/lib/auth/auth-me", () => ({
    loadCurrentUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      const user = await getUserById(userId);

      if (!user) {
        throw new Error(`Missing test user ${userId}`);
      }

      return user;
    },
  }));
  vi.doMock("@/lib/auth/protected-session", () => ({
    loadUser: async () => {
      const { getUserById } = await import("@/lib/db/store/user.store");
      const user = await getUserById(userId);

      if (!user) {
        throw new Error(`Missing test user ${userId}`);
      }

      return { user };
    },
  }));
  vi.doMock("@/lib/server-request-context", () => ({
    getServerRequestContext: async () => ({}),
  }));
}

describe("played title summaries", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("returns only played titles in alphabetical order with aggregated stats", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture({ firstName: "Alex" });
      const opponent = await createUserFixture({ firstName: "Blair" });
      const outsider = await createUserFixture({ firstName: "Casey" });

      mockAuthenticatedUser(user.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const {
        addGamePlayer,
        commitGameRound,
        createConfiguredGame,
        upsertActiveRoundScore,
      } = await import("../../src/app/actions/game");

      const azul = await createConfiguredGame({
        gameTitleName: "Azul",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 1,
      });
      await addGamePlayer({ gameId: azul.id, userId: opponent.id });

      const skyjoOne = await createConfiguredGame({
        gameTitleName: "Skyjo",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 1,
      });
      await addGamePlayer({ gameId: skyjoOne.id, userId: opponent.id });
      await upsertActiveRoundScore({
        gameId: skyjoOne.id,
        userId: user.id,
        scoreDelta: 10,
      });
      await upsertActiveRoundScore({
        gameId: skyjoOne.id,
        userId: opponent.id,
        scoreDelta: 14,
      });
      await commitGameRound({ gameId: skyjoOne.id, completeGame: true });

      const skyjoTwo = await createConfiguredGame({
        gameTitleName: "Skyjo",
        scoringMode: "lowest_wins",
        endingMode: "round_count",
        targetRounds: 1,
      });
      await addGamePlayer({ gameId: skyjoTwo.id, userId: opponent.id });
      await upsertActiveRoundScore({
        gameId: skyjoTwo.id,
        userId: user.id,
        scoreDelta: 20,
      });
      await upsertActiveRoundScore({
        gameId: skyjoTwo.id,
        userId: opponent.id,
        scoreDelta: 15,
      });
      await commitGameRound({ gameId: skyjoTwo.id, completeGame: true });

      await createGameFixture({
        creatorId: outsider.id,
        title: "Catan",
      });

      vi.resetModules();
      mockAuthenticatedUser(user.id);
      vi.doMock("next/cache", () => ({
        revalidatePath: vi.fn(),
        revalidateTag: vi.fn(),
      }));

      const { listPlayedGameTitleSummaries } = await import(
        "../../src/lib/db/store/game.store"
      );
      const { getPlayedTitlesPageCollections } = await import(
        "../../src/app/actions/pages/played-titles"
      );

      const summaries = await listPlayedGameTitleSummaries(user.id);
      const collections = await getPlayedTitlesPageCollections({
        userId: user.id,
        searchParams: {
          query: " sky  ",
        },
      });

      expect(summaries.map((title) => title.title)).toEqual(["Azul", "Skyjo"]);
      expect(summaries[0]).toMatchObject({
        title: "Azul",
        timesPlayed: 1,
        topThreeFinishes: 0,
        averageScore: null,
      });
      expect(summaries[1]).toMatchObject({
        title: "Skyjo",
        timesPlayed: 2,
        topThreeFinishes: 2,
        averageScore: 15,
      });
      expect(collections.filters.query).toBe("sky");
      expect(collections.gameTitles.map((title) => title.title)).toEqual([
        "Azul",
        "Skyjo",
      ]);
    }, "played-title-summaries");
  });
});
