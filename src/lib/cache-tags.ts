export function getFriendsTag(userId: string) {
  return `friends:${userId}`;
}

export function getDashboardTag(userId: string) {
  return `dashboard:${userId}`;
}

export function getTitlesTag(userId: string) {
  return `titles:${userId}`;
}

export function getTitlesGlobalTag() {
  return "titles:global";
}

export function getGameHistoryTag(userId: string) {
  return `game-history:${userId}`;
}

export function getProfileOverviewTag(userId: string) {
  return `profile-overview:${userId}`;
}

export function getPublicProfileTag(userId: string) {
  return `public-profile:${userId}`;
}

export function getPlayerRankTag(userId: string) {
  return `player-rank:${userId}`;
}

export function getPlayerRankStandingsTag() {
  return "player-rank:standings";
}

export function getPlayerRankHistoryTag() {
  return "player-rank:history";
}
