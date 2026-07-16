import CreateGameSettingsStep from "@/components/game/create-game-settings-step";
import { loadUser } from "@/lib/auth/protected-session";
import {
  getGameTitleLibraryEntryById,
  listGameTitles,
  listSuggestedGameTitles,
  listUnstartedGamesByTitle,
} from "@/lib/db/store/game.store";

type PageProps = {
  searchParams: Promise<{
    titleId?: string;
    newTitle?: string;
  }>;
};

export default async function CreateGameSettingsPage({
  searchParams,
}: PageProps) {
  const { user } = await loadUser();
  const { titleId, newTitle } = await searchParams;
  const [
    allGameTitles,
    suggestedGameTitles,
    initialSelectedTitle,
    unstartedGamesByTitle,
  ] = await Promise.all([
    listGameTitles(user.id),
    listSuggestedGameTitles({
      userId: user.id,
      limit: 5,
    }),
    titleId
      ? getGameTitleLibraryEntryById({
          userId: user.id,
          gameTitleId: titleId,
        })
      : Promise.resolve(null),
    listUnstartedGamesByTitle(user.id),
  ]);

  return (
    <CreateGameSettingsStep
      allGameTitles={allGameTitles}
      initialNewTitle={newTitle?.trim() ?? null}
      initialSelectedTitle={initialSelectedTitle}
      currentUserColor={user.color}
      suggestedGameTitles={suggestedGameTitles}
      unstartedGamesByTitle={unstartedGamesByTitle}
    />
  );
}
