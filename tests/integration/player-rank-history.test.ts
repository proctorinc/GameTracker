import { describe, expect, it } from "vitest";
import { createUserFixture } from "../fixtures/users";
import { withTestDatabase } from "../helpers/test-db";

describe("player rank history", () => {
  it("stores sparse snapshots, carries them forward, and rebuilds positions when another user jumps ahead", async () => {
    await withTestDatabase(async () => {
      const dayOne = "2026-06-10T12:00:00.000Z";
      const dayThree = "2026-06-12T12:00:00.000Z";

      const alpha = await createUserFixture({
        firstName: "Alpha",
        createdAt: dayOne,
      });
      const beta = await createUserFixture({
        firstName: "Beta",
        createdAt: dayOne,
      });
      const gamma = await createUserFixture({
        firstName: "Gamma",
        createdAt: dayOne,
      });

      const {
        db,
        games,
        gamePlayerRankResults,
        playerRankConfigs,
      } = await import("../../src/lib/db");
      const {
        listPlayerRankHistorySeries,
        rebuildPlayerRankHistoryFromDate,
      } = await import("../../src/lib/db/store/player-rank.store");

      const [config] = await db
        .insert(playerRankConfigs)
        .values({
          version: "v1",
          isActive: true,
          windowMonths: 6,
          defaultMaxPrizePool: 40000,
          prizePoolByPlayerCountJson: JSON.stringify({
            2: 5000,
            3: 10000,
            4: 20000,
            5: 30000,
          }),
          smallGameDistributionJson: JSON.stringify({
            2: [10000, 0, 0],
            3: [10000, 0, 0],
          }),
          largeGameDistributionJson: JSON.stringify([6000, 3000, 1000]),
          createdByUserId: alpha.id,
          createdAt: dayOne,
        })
        .returning();

      if (!config) {
        throw new Error("Missing player rank config");
      }

      await db.insert(games).values([
        {
          id: "game-1",
          creatorId: alpha.id,
          scoringMode: "highest_wins",
          completedAt: dayOne,
        },
        {
          id: "game-2",
          creatorId: gamma.id,
          scoringMode: "highest_wins",
          completedAt: dayThree,
        },
      ]);

      await db.insert(gamePlayerRankResults).values([
        {
          gameId: "game-1",
          userId: alpha.id,
          gameCompletedAt: dayOne,
          playerCount: 2,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 10000,
          pointsAwardedMinor: 5000,
          createdAt: dayOne,
        },
        {
          gameId: "game-1",
          userId: beta.id,
          gameCompletedAt: dayOne,
          playerCount: 2,
          placement: 2,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 0,
          pointsAwardedMinor: 0,
          createdAt: dayOne,
        },
      ]);

      await rebuildPlayerRankHistoryFromDate({
        startDate: dayOne,
        now: new Date(dayThree),
      });

      const initialHistoryRows = await db.query.playerRankHistory.findMany({
        orderBy: (table, { asc }) => [asc(table.historyDate), asc(table.userId)],
      });

      expect(initialHistoryRows).toHaveLength(3);
      expect(initialHistoryRows.every((row) => row.historyDate === "2026-06-10")).toBe(true);
      expect(initialHistoryRows.map((row) => row.userId).sort()).toEqual(
        [alpha.id, beta.id, gamma.id].sort(),
      );

      const carriedSeries = await listPlayerRankHistorySeries({
        userIds: [alpha.id],
        days: 3,
        now: new Date(dayThree),
      });

      expect(
        carriedSeries.pointsByUserId[alpha.id]?.map((point) => point.playerRankPosition),
      ).toEqual([1, 1, 1]);

      await db.insert(gamePlayerRankResults).values([
        {
          gameId: "game-2",
          userId: gamma.id,
          gameCompletedAt: dayThree,
          playerCount: 2,
          placement: 1,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 10000,
          pointsAwardedMinor: 7000,
          createdAt: dayThree,
        },
        {
          gameId: "game-2",
          userId: beta.id,
          gameCompletedAt: dayThree,
          playerCount: 2,
          placement: 2,
          tieSize: 1,
          rankConfigId: config.id,
          prizePoolMinor: 5000,
          payoutPercentBps: 0,
          pointsAwardedMinor: 0,
          createdAt: dayThree,
        },
      ]);

      await rebuildPlayerRankHistoryFromDate({
        startDate: dayThree,
        now: new Date(dayThree),
      });

      const rebuiltRows = await db.query.playerRankHistory.findMany({
        orderBy: (table, { asc }) => [asc(table.historyDate), asc(table.userId)],
      });

      expect(rebuiltRows).toHaveLength(6);
      expect(
        rebuiltRows.filter((row) => row.historyDate === "2026-06-10").map((row) => row.userId).sort(),
      ).toEqual([alpha.id, beta.id, gamma.id].sort());
      expect(
        rebuiltRows.filter((row) => row.historyDate === "2026-06-12").map((row) => row.userId).sort(),
      ).toEqual([alpha.id, beta.id, gamma.id].sort());

      const rebuiltSeries = await listPlayerRankHistorySeries({
        userIds: [alpha.id, gamma.id],
        days: 3,
        now: new Date(dayThree),
      });

      expect(
        rebuiltSeries.pointsByUserId[alpha.id]?.map((point) => point.playerRankPosition),
      ).toEqual([1, 1, 2]);
      expect(
        rebuiltSeries.pointsByUserId[gamma.id]?.map((point) => point.playerRankPosition),
      ).toEqual([2, 2, 1]);
    }, "player-rank-history-rebuild");
  });

  it("derives 30-day recent movement from sparse carried-forward history snapshots", async () => {
    await withTestDatabase(async () => {
      const user = await createUserFixture({
        firstName: "Alpha",
        createdAt: "2026-05-01T12:00:00.000Z",
      });

      const { db, playerRankHistory } = await import("../../src/lib/db");
      const { getPlayerRankRecentChangeSummary } = await import(
        "../../src/lib/db/store/player-rank.store"
      );

      await db.insert(playerRankHistory).values([
        {
          userId: user.id,
          historyDate: "2026-05-31",
          playerRankPosition: 3,
          playerRankTotalMinor: 20_000,
          playerRankGamesCount: 2,
          topThreeFinishes: 2,
          createdAt: "2026-05-31T12:00:00.000Z",
          updatedAt: "2026-05-31T12:00:00.000Z",
        },
        {
          userId: user.id,
          historyDate: "2026-06-20",
          playerRankPosition: 1,
          playerRankTotalMinor: 58_800,
          playerRankGamesCount: 6,
          topThreeFinishes: 4,
          createdAt: "2026-06-20T12:00:00.000Z",
          updatedAt: "2026-06-20T12:00:00.000Z",
        },
      ]);

      const summary = await getPlayerRankRecentChangeSummary(user.id, {
        recentDays: 30,
        now: new Date("2026-06-30T12:00:00.000Z"),
      });

      expect(summary.startRankTotalMinor).toBe(20_000);
      expect(summary.currentRankTotalMinor).toBe(58_800);
      expect(summary.recentIncrease?.deltaMinor).toBe(38_800);
      expect(summary.recentIncrease?.deltaFormatted).toBe("+388");
      expect(summary.recentDecrease).toBeNull();
    }, "player-rank-history-recent-summary");
  });
});
