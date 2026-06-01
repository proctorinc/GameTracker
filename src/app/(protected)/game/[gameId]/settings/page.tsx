import GameSettingsPage from "@/components/game/game-settings-page";
import { loadUser } from "@/lib/auth/protected-session";
import { getGameForPlayPage } from "@/lib/db/store/game.store";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    gameId: string;
  }>;
};

export default async function GameSettingsRoute({ params }: PageProps) {
  const { user } = await loadUser();
  const { gameId } = await params;

  if (!user) {
    notFound();
  }

  const game = await getGameForPlayPage(gameId);

  if (!game || game.creatorId !== user.id) {
    notFound();
  }

  return <GameSettingsPage game={game} />;
}
