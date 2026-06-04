export type PublicProfileSummaryData = {
  profile: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    createdAt: string | null;
    displayName: string;
  };
  bestFriend: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    color: string;
    displayName: string;
    gamesPlayedTogether: number;
    lastPlayedAt: string | null;
  } | null;
  stats: {
    friendCount: number;
    gamesPlayed: number;
    gamesWon: number;
    winRate: number | null;
    gamesHosted: number;
    titlesPlayed: number;
    favoriteTitle: string | null;
    favoriteTitleCount: number;
    lastPlayedAt: string | null;
  };
};
