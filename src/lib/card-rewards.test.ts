import { describe, expect, it } from "vitest";
import { getEligibleCardRewardUserIds } from "./card-reward-eligibility";
import { drawCardCandidates, rollAvailableRarity, validateDeckOdds } from "./card-catalog";

function player(
  userId: string,
  input?: { isGuest?: boolean; mergedIntoUserId?: string | null },
) {
  return {
    userId,
    user: {
      isGuest: input?.isGuest ?? false,
      mergedIntoUserId: input?.mergedIntoUserId ?? null,
    },
  };
}

describe("card reward eligibility", () => {
  it("returns distinct real registered participants", () => {
    expect(
      getEligibleCardRewardUserIds([
        player("user-a"),
        player("user-b"),
        player("guest", { isGuest: true }),
        player("merged", { mergedIntoUserId: "user-a" }),
        player("user-a"),
      ]),
    ).toEqual(["user-a", "user-b"]);
  });

  it("does not let guest or duplicate self seats create a real opponent", () => {
    expect(
      getEligibleCardRewardUserIds([
        player("user-a"),
        player("user-a"),
        player("guest", { isGuest: true }),
      ]),
    ).toEqual(["user-a"]);
  });
});

describe("card rarity configuration", () => {
  const odds = { common: 70, uncommon: 20, rare: 8, legendary: 2 } as const;

  it("validates a complete rarity distribution", () => {
    expect(validateDeckOdds(odds)).toEqual(odds);
    expect(() => validateDeckOdds({ ...odds, common: 69 })).toThrow(/total 100/);
  });

  it("rolls against only available rarities and renormalizes their weights", () => {
    const available = new Set(["rare", "legendary"] as const);
    expect(rollAvailableRarity(odds, available, () => 0)).toBe("rare");
    expect(rollAvailableRarity(odds, available, () => 0.999)).toBe("legendary");
  });

  it("supports a zero-weight available tier when it is the only option", () => {
    expect(
      rollAvailableRarity(
        { common: 100, uncommon: 0, rare: 0, legendary: 0 },
        new Set(["legendary"]),
        () => 0,
      ),
    ).toBe("legendary");
  });

  it("avoids duplicate designs until a rarity pool is exhausted", () => {
    const draws = drawCardCandidates({
      candidates: [
        { identityKey: "one", rarity: "common" as const },
        { identityKey: "two", rarity: "common" as const },
      ],
      odds,
      count: 3,
      random: () => 0,
    });
    expect(draws.map((draw) => draw.candidate.identityKey)).toEqual([
      "one",
      "two",
      "one",
    ]);
  });
});
