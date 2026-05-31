import CreateGameSettingsStep from "@/components/game/create-game-settings-step";
import { loadUser } from "@/lib/auth/protected-session";
import {
  getGameTitleLibraryEntryById,
  listGameTitles,
  listSuggestedGameTitles,
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
  const [allGameTitles, suggestedGameTitles, initialSelectedTitle] = await Promise.all([
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
  ]);

  return (
    <CreateGameSettingsStep
      allGameTitles={allGameTitles}
      initialNewTitle={newTitle?.trim() ?? null}
      initialSelectedTitle={initialSelectedTitle}
      suggestedGameTitles={suggestedGameTitles}
    />
  );
}
