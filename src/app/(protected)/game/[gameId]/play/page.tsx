import PlayGame from "@/components/game/PlayGame";
import { loadUser } from "@/lib/auth/protected-session";
import { listAcceptedFriendsForUser } from "@/lib/db/store/friendship.store";
import { getGameForPlayPage } from "@/lib/db/store/game.store";
import { listGuestsCreatedByUser } from "@/lib/db/store/user.store";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export default async function PlayGamePage({ params }: PageProps) {
  const { user } = await loadUser();
  const { gameId } = await params;

  if (!user) {
    notFound();
  }

  const game = await getGameForPlayPage(gameId);

  if (!game) {
    notFound();
  }

  const isCreator = game.creatorId === user.id;
  const isPlayer = game.players.some((player) => player.userId === user.id);

  if (!isCreator && !isPlayer) {
    notFound();
  }

  const [friends, guests] = await Promise.all([
    listAcceptedFriendsForUser(user.id),
    listGuestsCreatedByUser(user.id),
  ]);
  const playerOptions = [...friends, ...guests];

  return (
    <PlayGame
      currentUserId={user.id}
      isCreator={isCreator}
      playerOptions={playerOptions}
      game={game}
    />
  );
}
