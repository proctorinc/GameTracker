export type ProfileStatsUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  color: string;
  isGuest: boolean;
  mergedIntoUserId?: string | null;
};

export type ProfileStatsComparisonOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  color: string;
  displayName: string;
  isGuest: boolean;
};

export type ProfileStatsTitle = {
  id: string;
  title: string;
  imageUrl: string;
};

export type ProfileStatsCompletedGame = {
  id: string;
  createdAt: string;
  completedAt: string;
  title: ProfileStatsTitle | null;
  participantUserIds: string[];
  winnerUserIds: string[];
};

export type ProfileStatsStreak = {
  type: "win" | "loss" | null;
  count: number;
};

export type ProfileStatsStoryline = {
  kind: "hot" | "cold" | "steady" | "fresh";
  label: string;
  detail: string;
};

export type ProfileStatsSignatureTitle = {
  id: string;
  title: string;
  imageUrl: string;
  completedCount: number;
  winRate: number;
  lastPlayedAt: string;
};

export type ProfileStatsBestFriend = ProfileStatsComparisonOption & {
  completedGamesTogether: number;
  lastPlayedAt: string | null;
};

export type ProfileStatsComparisonSummary = {
  user: ProfileStatsComparisonOption;
  completedGamesTogether: number;
  wins: number;
  losses: number;
  winRate: number | null;
  currentStreak: ProfileStatsStreak;
  favoriteSharedTitle: (ProfileStatsTitle & { completedCount: number }) | null;
  lastPlayedAt: string | null;
  recentWins: number;
  recentGamesCount: number;
};

export type ProfileStatsSummary = {
  completedGames: number;
  wins: number;
  winRate: number | null;
  friendCount: number;
  lastPlayedAt: string | null;
  currentStreak: ProfileStatsStreak;
  bestWinStreak: number;
  bestFriendGames: number;
  storyline: ProfileStatsStoryline;
  signatureTitle: ProfileStatsSignatureTitle | null;
};

export type BuiltProfileStats = {
  comparisonOptions: ProfileStatsComparisonOption[];
  comparisonSummariesByUserId: Record<string, ProfileStatsComparisonSummary>;
  defaultComparisonUserId: string | null;
  defaultBestFriend: ProfileStatsBestFriend | null;
  stats: ProfileStatsSummary;
};

export function formatProfileDisplayName(input: {
  firstName: string | null;
  lastName: string | null;
}) {
  return [input.firstName, input.lastName].filter(Boolean).join(" ").trim() || "Skybo Player";
}

export function buildComparisonOptions(input: {
  profileUserId: string;
  friends: ProfileStatsUser[];
  guests?: ProfileStatsUser[];
  recentlyPlayedWith?: ProfileStatsUser[];
  includeGuests: boolean;
}): ProfileStatsComparisonOption[] {
  const byId = new Map<string, ProfileStatsComparisonOption>();

  for (const friend of input.friends) {
    if (friend.id === input.profileUserId || friend.mergedIntoUserId) {
      continue;
    }

    byId.set(friend.id, toComparisonOption(friend));
  }

  if (input.includeGuests) {
    for (const guest of input.guests ?? []) {
      if (
        guest.id === input.profileUserId ||
        guest.mergedIntoUserId ||
        !guest.isGuest
      ) {
        continue;
      }

      byId.set(guest.id, toComparisonOption(guest));
    }
  }

  for (const recentPlayer of input.recentlyPlayedWith ?? []) {
    if (recentPlayer.id === input.profileUserId || recentPlayer.mergedIntoUserId) {
      continue;
    }

    byId.set(recentPlayer.id, toComparisonOption(recentPlayer));
  }

  return Array.from(byId.values()).sort((left, right) =>
    left.displayName.localeCompare(right.displayName),
  );
}

export function buildProfileStats(input: {
  profileUserId: string;
  completedGames: ProfileStatsCompletedGame[];
  comparisonOptions: ProfileStatsComparisonOption[];
  friendCount: number;
}): BuiltProfileStats {
  const sortedGames = [...input.completedGames].sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt),
  );
  const optionById = new Map(
    input.comparisonOptions.map((option) => [option.id, option] as const),
  );
  const comparisonSummariesByUserId = Object.fromEntries(
    input.comparisonOptions.map((option) => [
      option.id,
      {
        user: option,
        completedGamesTogether: 0,
        wins: 0,
        losses: 0,
        winRate: null,
        currentStreak: { type: null, count: 0 },
        favoriteSharedTitle: null,
        lastPlayedAt: null,
        recentWins: 0,
        recentGamesCount: 0,
      } satisfies ProfileStatsComparisonSummary,
    ]),
  ) as Record<string, ProfileStatsComparisonSummary>;

  const titleStats = new Map<
    string,
    ProfileStatsSignatureTitle & { wins: number }
  >();
  const sharedTitleStats = new Map<
    string,
    Map<string, { title: ProfileStatsTitle; count: number }>
  >();
  const comparisonDecisiveResults = new Map<
    string,
    Array<"win" | "loss">
  >();

  let completedWins = 0;
  let bestWinStreak = 0;
  let currentWinStreak = 0;
  const lastPlayedAt: string | null = sortedGames[0]?.completedAt ?? null;

  for (const game of sortedGames) {
    const profileWon = didUserWin(game.winnerUserIds, input.profileUserId);

    if (profileWon) {
      completedWins += 1;
    }

    if (game.title) {
      const existing = titleStats.get(game.title.id);
      titleStats.set(game.title.id, {
        id: game.title.id,
        title: game.title.title,
        imageUrl: game.title.imageUrl,
        completedCount: (existing?.completedCount ?? 0) + 1,
        wins: (existing?.wins ?? 0) + (profileWon ? 1 : 0),
        lastPlayedAt:
          !existing || game.completedAt > existing.lastPlayedAt
            ? game.completedAt
            : existing.lastPlayedAt,
        winRate: 0,
      });
    }

    for (const participantUserId of game.participantUserIds) {
      if (participantUserId === input.profileUserId) {
        continue;
      }

      const comparisonOption = optionById.get(participantUserId);
      if (!comparisonOption) {
        continue;
      }

      const existing = comparisonSummariesByUserId[participantUserId];
      existing.completedGamesTogether += 1;
      existing.lastPlayedAt =
        !existing.lastPlayedAt || game.completedAt > existing.lastPlayedAt
          ? game.completedAt
          : existing.lastPlayedAt;

      const candidateWon = didUserWin(game.winnerUserIds, participantUserId);
      const decisiveResult = profileWon !== candidateWon
        ? profileWon
          ? "win"
          : "loss"
        : null;

      if (decisiveResult === "win") {
        existing.wins += 1;
      } else if (decisiveResult === "loss") {
        existing.losses += 1;
      }

      const decisiveResults = comparisonDecisiveResults.get(participantUserId) ?? [];
      if (decisiveResult) {
        decisiveResults.push(decisiveResult);
        comparisonDecisiveResults.set(participantUserId, decisiveResults);
      }

      if (existing.recentGamesCount < 4) {
        existing.recentGamesCount += 1;
        if (decisiveResult === "win") {
          existing.recentWins += 1;
        }
      }

      if (game.title) {
        const titlesForUser =
          sharedTitleStats.get(participantUserId) ?? new Map<string, { title: ProfileStatsTitle; count: number }>();
        const sharedTitle = titlesForUser.get(game.title.id);
        titlesForUser.set(game.title.id, {
          title: game.title,
          count: (sharedTitle?.count ?? 0) + 1,
        });
        sharedTitleStats.set(participantUserId, titlesForUser);
      }
    }
  }

  const ascendingGames = [...sortedGames].reverse();
  for (const game of ascendingGames) {
    if (didUserWin(game.winnerUserIds, input.profileUserId)) {
      currentWinStreak += 1;
      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
      continue;
    }

    currentWinStreak = 0;
  }

  const currentStreak = getCurrentUserStreak(sortedGames, input.profileUserId);
  const signatureTitle = Array.from(titleStats.values())
    .map((entry) => ({
      ...entry,
      winRate: Math.round((entry.wins / entry.completedCount) * 100),
    }))
    .sort((left, right) => {
      if (right.completedCount !== left.completedCount) {
        return right.completedCount - left.completedCount;
      }

      if (right.lastPlayedAt !== left.lastPlayedAt) {
        return right.lastPlayedAt.localeCompare(left.lastPlayedAt);
      }

      return left.title.localeCompare(right.title);
    })[0] ?? null;

  for (const option of input.comparisonOptions) {
    const summary = comparisonSummariesByUserId[option.id];
    const decisiveGameCount = summary.wins + summary.losses;
    summary.winRate =
      decisiveGameCount > 0
        ? Math.round((summary.wins / decisiveGameCount) * 100)
        : null;

    const decisiveResults = comparisonDecisiveResults.get(option.id) ?? [];
    summary.currentStreak = getCurrentComparisonStreak(decisiveResults);

    const favoriteSharedTitle = Array.from(
      (sharedTitleStats.get(option.id) ?? new Map()).values(),
    )
      .sort((left, right) => {
        if (right.count !== left.count) {
          return right.count - left.count;
        }

        return left.title.title.localeCompare(right.title.title);
      })[0] ?? null;

    summary.favoriteSharedTitle = favoriteSharedTitle
      ? {
          ...favoriteSharedTitle.title,
          completedCount: favoriteSharedTitle.count,
        }
      : null;
  }

  const comparisonOptions = [...input.comparisonOptions].sort((left, right) => {
    const leftSummary = comparisonSummariesByUserId[left.id];
    const rightSummary = comparisonSummariesByUserId[right.id];

    if (leftSummary.lastPlayedAt && rightSummary.lastPlayedAt) {
      if (leftSummary.lastPlayedAt !== rightSummary.lastPlayedAt) {
        return rightSummary.lastPlayedAt.localeCompare(leftSummary.lastPlayedAt);
      }
    } else if (leftSummary.lastPlayedAt) {
      return -1;
    } else if (rightSummary.lastPlayedAt) {
      return 1;
    }

    return left.displayName.localeCompare(right.displayName);
  });

  const defaultBestFriendSummary = [...comparisonOptions]
    .map((option) => comparisonSummariesByUserId[option.id])
    .sort((left, right) => {
      if (right.completedGamesTogether !== left.completedGamesTogether) {
        return right.completedGamesTogether - left.completedGamesTogether;
      }

      if (left.lastPlayedAt && right.lastPlayedAt) {
        return right.lastPlayedAt.localeCompare(left.lastPlayedAt);
      }

      if (left.lastPlayedAt) {
        return -1;
      }

      if (right.lastPlayedAt) {
        return 1;
      }

      return left.user.displayName.localeCompare(right.user.displayName);
    })[0] ?? null;

  const defaultBestFriend =
    defaultBestFriendSummary && defaultBestFriendSummary.completedGamesTogether > 0
      ? {
          ...defaultBestFriendSummary.user,
          completedGamesTogether: defaultBestFriendSummary.completedGamesTogether,
          lastPlayedAt: defaultBestFriendSummary.lastPlayedAt,
        }
      : null;

  const defaultComparisonUserId =
    defaultBestFriend?.id ?? comparisonOptions[0]?.id ?? null;
  const completedGamesCount = sortedGames.length;
  const storyline = buildStoryline({
    completedGamesCount,
    currentStreak,
    recentGames: sortedGames.slice(0, 6),
    profileUserId: input.profileUserId,
  });

  return {
    comparisonOptions,
    comparisonSummariesByUserId,
    defaultComparisonUserId,
    defaultBestFriend,
    stats: {
      completedGames: completedGamesCount,
      wins: completedWins,
      winRate:
        completedGamesCount > 0
          ? Math.round((completedWins / completedGamesCount) * 100)
          : null,
      friendCount: input.friendCount,
      lastPlayedAt,
      currentStreak,
      bestWinStreak,
      bestFriendGames: defaultBestFriend?.completedGamesTogether ?? 0,
      storyline,
      signatureTitle,
    },
  };
}

function toComparisonOption(user: ProfileStatsUser): ProfileStatsComparisonOption {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    color: user.color,
    displayName: formatProfileDisplayName(user),
    isGuest: user.isGuest,
  };
}

function didUserWin(winnerUserIds: string[], userId: string) {
  return winnerUserIds.includes(userId);
}

function getCurrentUserStreak(
  games: ProfileStatsCompletedGame[],
  profileUserId: string,
): ProfileStatsStreak {
  const latestResult = games.find((game) =>
    game.winnerUserIds.includes(profileUserId) ||
    game.winnerUserIds.length > 0
  );

  if (!latestResult) {
    return { type: null, count: 0 };
  }

  const streakType = didUserWin(latestResult.winnerUserIds, profileUserId)
    ? "win"
    : "loss";
  let count = 0;

  for (const game of games) {
    const gameResult = didUserWin(game.winnerUserIds, profileUserId) ? "win" : "loss";
    if (gameResult !== streakType) {
      break;
    }

    count += 1;
  }

  return { type: streakType, count };
}

function getCurrentComparisonStreak(results: Array<"win" | "loss">): ProfileStatsStreak {
  const first = results[0];

  if (!first) {
    return { type: null, count: 0 };
  }

  let count = 0;
  for (const result of results) {
    if (result !== first) {
      break;
    }

    count += 1;
  }

  return {
    type: first,
    count,
  };
}

function buildStoryline(input: {
  completedGamesCount: number;
  currentStreak: ProfileStatsStreak;
  recentGames: ProfileStatsCompletedGame[];
  profileUserId: string;
}): ProfileStatsStoryline {
  if (input.completedGamesCount === 0) {
    return {
      kind: "fresh",
      label: "Still warming up",
      detail: "Finish a few games to unlock your competitive story.",
    };
  }

  if (input.currentStreak.type === "win" && input.currentStreak.count >= 2) {
    return {
      kind: "hot",
      label: `Won ${input.currentStreak.count} straight`,
      detail: "Someone is on a heater right now.",
    };
  }

  if (input.currentStreak.type === "loss" && input.currentStreak.count >= 2) {
    return {
      kind: "cold",
      label: `Trying to snap a ${input.currentStreak.count}-game skid`,
      detail: "The next completed game could flip the story.",
    };
  }

  const recentGameCount = input.recentGames.length;
  const recentWins = input.recentGames.filter((game) =>
    didUserWin(game.winnerUserIds, input.profileUserId),
  ).length;
  const recentLosses = recentGameCount - recentWins;

  if (recentWins === recentLosses) {
    return {
      kind: "steady",
      label: `Split the last ${recentGameCount}`,
      detail: "Pretty even lately, which makes the next game matter more.",
    };
  }

  return {
    kind: recentWins > recentLosses ? "hot" : "steady",
    label: `Won ${recentWins} of the last ${recentGameCount}`,
    detail: "Recent form is starting to take shape.",
  };
}
