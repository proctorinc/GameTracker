export function getEligibleCardRewardUserIds(
  players: Array<{
    userId: string;
    user: { isGuest: boolean; mergedIntoUserId: string | null };
  }>,
) {
  return Array.from(
    new Set(
      players
        .filter(
          (player) => !player.user.isGuest && !player.user.mergedIntoUserId,
        )
        .map((player) => player.userId),
    ),
  );
}

export const getEligibleSkyjoRewardUserIds = getEligibleCardRewardUserIds;
