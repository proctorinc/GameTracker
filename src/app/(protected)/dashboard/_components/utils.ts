import type { DashboardPageData } from "@/app/actions/pages/dashboard";

export function formatGameDate(value: string | null | undefined) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
  });
}

export function getPlayerLabel(
  player: DashboardPageData["recentActiveGames"][number]["players"][number],
  currentUserId: string,
) {
  return player.user.id === currentUserId
    ? "Me"
    : (player.user.firstName ?? "Player");
}

export function getWinner(
  game: DashboardPageData["recentCompletedGames"][number],
  currentUserId: string,
) {
  const winner = game.winners[0];

  if (!winner) {
    return null;
  }

  return {
    label:
      winner.userId === currentUserId
        ? "You"
        : (winner.user.firstName ?? "Player"),
    user: winner.user,
  };
}
