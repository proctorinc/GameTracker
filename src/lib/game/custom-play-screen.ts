import {
  buildLostCitiesGameSettingsTemplate,
  buildLostCitiesItemizedCategories,
  getScopedCategoryKeySuffix,
  isLostCitiesTitle,
} from "@/lib/game/lost-cities";
import {
  parseGameSettingsV2,
  validateGameSettingsV2,
  type GameSettingsV2,
} from "@/lib/game/v2";

type CustomPlayScreenTitle = {
  defaultSettingsJson?: string | null;
  defaultSettingsVersion?: string | null;
  normalizedTitle: string;
};

export function hasCustomPlayGameV2Screen(
  title: CustomPlayScreenTitle | null | undefined,
) {
  return isLostCitiesTitle(title);
}

function comparableSettings(settings: GameSettingsV2) {
  return {
    ...settings,
    itemizedCategories: settings.itemizedCategories.map((category) => ({
      ...category,
      id: getScopedCategoryKeySuffix(category.id),
    })),
  };
}

export function supportsCustomPlayGameV2Screen(input: {
  gameSpecificSettingsJson?: string | null;
  settings: GameSettingsV2;
  title: CustomPlayScreenTitle | null | undefined;
}) {
  if (!hasCustomPlayGameV2Screen(input.title)) return false;

  if (isLostCitiesTitle(input.title)) {
    let expeditionCount: 5 | 6 = 5;
    try {
      const specificSettings = JSON.parse(
        input.gameSpecificSettingsJson ?? "{}",
      ) as { expeditionCount?: unknown };
      expeditionCount = specificSettings.expeditionCount === 6 ? 6 : 5;
    } catch {
      expeditionCount = 5;
    }
    const titleDefaults =
      input.title?.defaultSettingsVersion === "v2"
        ? parseGameSettingsV2(input.title.defaultSettingsJson)
        : null;
    const defaults = titleDefaults
      ? validateGameSettingsV2({
          ...titleDefaults,
          itemizedCategories: buildLostCitiesItemizedCategories(expeditionCount),
          playerConfig: {
            ...titleDefaults.playerConfig,
            allPlayersAreManagers: false,
          },
        })
      : buildLostCitiesGameSettingsTemplate(expeditionCount);

    return (
      JSON.stringify(comparableSettings(input.settings)) ===
      JSON.stringify(comparableSettings(defaults))
    );
  }

  return false;
}
