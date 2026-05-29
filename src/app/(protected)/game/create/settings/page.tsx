import CreateGameSettingsStep from "@/components/game/create-game-settings-step";
import { loadUser } from "@/lib/auth/protected-session";
import { listGameTitles } from "@/lib/db/store/game.store";
import {
  APP_GAME_SETTINGS_DEFAULTS,
  normalizeGameTitleDefaults,
  resolveGameSettingsDefaults,
} from "@/lib/game/title-defaults";
import { redirect } from "next/navigation";

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
  const trimmedNewTitle = newTitle?.trim() ?? "";

  if (!titleId && !trimmedNewTitle) {
    redirect("/game/create");
  }

  const gameTitles = await listGameTitles(user.id);

  if (titleId) {
    const selectedTitle = gameTitles.find((title) => title.id === titleId);

    if (!selectedTitle) {
      redirect("/game/create");
    }

    return (
      <CreateGameSettingsStep
        draftTitle={{
          titleId: selectedTitle.id,
          newTitle: null,
          label: selectedTitle.title,
        }}
        initialSettings={resolveGameSettingsDefaults(
          normalizeGameTitleDefaults(selectedTitle),
        )}
      />
    );
  }

  return (
    <CreateGameSettingsStep
      draftTitle={{
        titleId: null,
        newTitle: trimmedNewTitle,
        label: trimmedNewTitle,
      }}
      initialSettings={APP_GAME_SETTINGS_DEFAULTS}
    />
  );
}
