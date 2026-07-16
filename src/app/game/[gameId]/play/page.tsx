import PlayGame from "@/components/game/PlayGame";
import PlayGameV2 from "@/components/game/play-game-v2";
import { getOrCreateGameShareToken } from "@/lib/db/store/game.store";
import { loadOptionalCurrentUser } from "@/lib/auth/auth-me";
import { listAcceptedFriendsForUser } from "@/lib/db/store/friendship.store";
import { getGameForPlayPage } from "@/lib/db/store/game.store";
import { listPendingJoinRequestsForGame } from "@/lib/db/store/game-join-request.store";
import { listPlayerRankGameDeltasForGame } from "@/lib/db/store/player-rank.store";
import { listGuestsCreatedByUser } from "@/lib/db/store/user.store";
import { notFound } from "next/navigation";
import { areCardsEnabled } from "@/lib/db/store/feature-flags.store";

type PageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export default async function PlayGamePage({ params }: PageProps) {
  const viewer = await loadOptionalCurrentUser();
  const { gameId } = await params;

  const game = await getGameForPlayPage(gameId);

  if (!game) {
    notFound();
  }

  const isCreator = viewer ? game.creatorId === viewer.id : false;
  const currentGamePlayer = viewer
    ? game.players.find((player) => player.userId === viewer.id) ?? null
    : null;
  const isManager = currentGamePlayer?.isManager ?? false;
  const canManageLiveGame = isCreator || isManager;

  const [friends, guests, shareToken, pendingJoinRequests, cardsEnabled] = viewer
    ? await Promise.all([
        listAcceptedFriendsForUser(viewer.id),
        listGuestsCreatedByUser(viewer.id),
        canManageLiveGame
          ? getOrCreateGameShareToken(game.id)
          : Promise.resolve(game.shareToken ?? null),
        canManageLiveGame
          ? listPendingJoinRequestsForGame(game.id)
          : Promise.resolve([]),
        areCardsEnabled(),
      ])
    : [[], [], game.shareToken ?? null, [], await areCardsEnabled()];
  const playerRankDeltas = await listPlayerRankGameDeltasForGame(gameId);

  const playGameProps = {
    cardsEnabled,
    currentUserId: viewer?.id ?? "",
    canManageLiveGame,
    gameSharePath: shareToken ? `/invite/game/${shareToken}` : null,
    isCreator,
    isManager,
    pendingJoinRequests,
    playerOptions: [...friends, ...guests],
    playerRankDeltas,
    game,
  };

  return game.version === "v2" ? (
    <PlayGameV2 key={game.id} {...playGameProps} />
  ) : (
    <PlayGame key={game.id} {...playGameProps} />
  );
}
