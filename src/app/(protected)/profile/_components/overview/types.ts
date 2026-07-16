import type { FriendsPageData } from "@/app/actions/pages/friends";
import type { ProfileStatsPageData } from "../../profile-types";
import type { CardCollectionDeckView } from "@/lib/collectible-cards";

export type CardCollectionDeck = CardCollectionDeckView;

export type ProfileOverviewUser = {
  id: string;
  role: "user" | "admin";
  firstName: string | null;
  lastName: string | null;
  color: string;
  avatarUrl: string | null;
  createdAt: string | null;
};

export type ProfileOverviewPageData = {
  cardsEnabled?: boolean;
  user: ProfileOverviewUser;
  profile: ProfileStatsPageData["profile"];
  canViewPlayerRank: boolean;
  playerRankTotal: string | null;
  playerRankPosition: number | null;
  playerRankWindowLabel: string | null;
  playerRankGamesCount: number | null;
  topThreeFinishes: number | null;
  playerRankRecentChangeSummary: ProfileStatsPageData["playerRankRecentChangeSummary"];
  twoPlayerPrizePool: string | null;
  threePlayerPrizePool: string | null;
  sixPlusPlayerPrizePool: string | null;
  defaultBestFriend: ProfileStatsPageData["defaultBestFriend"];
  stats: ProfileStatsPageData["stats"];
  comparisonOptions: ProfileStatsPageData["comparisonOptions"];
  comparisonSummariesByUserId: ProfileStatsPageData["comparisonSummariesByUserId"];
  defaultComparisonUserId: ProfileStatsPageData["defaultComparisonUserId"];
  socialData: FriendsPageData;
  hasPendingFriendInvitations: boolean;
  showInviteNotice: boolean;
  initialTab: ProfileOverviewTab;
  cardCollection: CardCollectionDeck[];
};

export type ProfileOverviewTab = "stats" | "friends" | "collection" | "settings";
