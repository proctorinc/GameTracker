import CreateGameTitleStep from "@/components/game/create-game-title-step";
import { loadUser } from "@/lib/auth/protected-session";
import { listGameTitles } from "@/lib/db/store/game.store";

type PageProps = {
  searchParams: Promise<{
    titleId?: string;
    newTitle?: string;
  }>;
};

export default async function CreateGamePage({ searchParams }: PageProps) {
  const { user } = await loadUser();
  const { titleId, newTitle } = await searchParams;
  const gameTitles = await listGameTitles(user.id);

  return (
    <CreateGameTitleStep
      gameTitles={gameTitles}
      initialTitleId={titleId ?? null}
      initialNewTitle={newTitle?.trim() ?? null}
    />
  );
}
