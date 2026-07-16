import type {
  PlayGameV2Config,
  PlayGameV2ScreenComponent,
  PlayGameV2ScreenProps,
} from "./types";
import { EliminationPlayGameV2Screen } from "./screens/elimination-screen";
import { ItemizedPlayGameV2Screen } from "./screens/itemized-screen";
import { LostCitiesPlayGameV2Screen } from "./screens/lost-cities-screen";
import { IncrementalPlayGameV2Screen } from "./screens/incremental-screen";
import { RoundWinnerPlayGameV2Screen } from "./screens/round-winner-screen";
import { createElement } from "react";
import { LOST_CITIES_NORMALIZED_TITLE } from "@/lib/game/lost-cities";
import { supportsCustomPlayGameV2Screen } from "@/lib/game/custom-play-screen";

type CustomPlayGameTitle = {
  defaultSettingsJson?: string | null;
  defaultSettingsVersion?: string | null;
  normalizedTitle: string;
} | null;

const customTitleScreenRegistry: Record<string, PlayGameV2ScreenComponent> = {
  [LOST_CITIES_NORMALIZED_TITLE]: LostCitiesPlayGameV2Screen,
};

const baseScreenRegistry: Record<
  PlayGameV2Config["variant"],
  PlayGameV2ScreenComponent
> = {
  elimination: EliminationPlayGameV2Screen,
  "end-game-tally": IncrementalPlayGameV2Screen,
  incremental: IncrementalPlayGameV2Screen,
  "round-winner": RoundWinnerPlayGameV2Screen,
};

export function resolvePlayGameV2Screen(
  config: PlayGameV2Config,
  gameTitle: CustomPlayGameTitle = null,
  gameSpecificSettingsJson?: string | null,
) {
  if (
    gameTitle &&
    supportsCustomPlayGameV2Screen({
      gameSpecificSettingsJson,
      settings: config.settings,
      title: gameTitle,
    })
  ) {
    const customScreen = customTitleScreenRegistry[gameTitle.normalizedTitle];
    if (customScreen) return customScreen;
  }

  if (config.itemizedCategories.length > 0) {
    return ItemizedPlayGameV2Screen;
  }

  return baseScreenRegistry[config.variant];
}

export function PlayGameV2ResolvedScreen(props: PlayGameV2ScreenProps) {
  const Screen = resolvePlayGameV2Screen(
    props.config,
    props.snapshot.game.gameTitle,
    props.snapshot.game.gameSpecificSettingsJson,
  );

  if (Screen === LostCitiesPlayGameV2Screen) {
    return createElement(Screen, props);
  }

  if (props.config.itemizedCategories.length > 0) {
    const scopeKey = props.config.settings.roundConfig.enabled
      ? `round-${props.viewModel.activeRoundNumber}`
      : "game";
    return createElement(ItemizedPlayGameV2Screen, { ...props, key: scopeKey });
  }

  switch (props.config.variant) {
    case "elimination":
      return createElement(EliminationPlayGameV2Screen, props);
    case "round-winner":
      return createElement(RoundWinnerPlayGameV2Screen, props);
    case "end-game-tally":
    case "incremental":
      return createElement(IncrementalPlayGameV2Screen, props);
  }
}
