import type { GamePlayerRole } from "@/lib/db/schema";
import {
  isLostCitiesTitle,
  type LostCitiesExpeditionCount,
} from "@/lib/game/lost-cities";

export type LostCitiesSpecificSettings = {
  expeditionCount: LostCitiesExpeditionCount;
};

export type GameSpecificSettings = LostCitiesSpecificSettings | Record<string, never>;

export type GameManagementSettings = {
  defaultPlayerRole: GamePlayerRole;
};

export const DEFAULT_GAME_MANAGEMENT_SETTINGS: GameManagementSettings = {
  defaultPlayerRole: "player",
};

export function getDefaultGameSpecificSettings(
  title: { normalizedTitle: string } | null | undefined,
): GameSpecificSettings {
  return isLostCitiesTitle(title) ? { expeditionCount: 5 } : {};
}

export function parseGameSpecificSettings(
  value: string | null | undefined,
  title: { normalizedTitle: string } | null | undefined,
): GameSpecificSettings {
  const fallback = getDefaultGameSpecificSettings(title);
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (isLostCitiesTitle(title)) {
      return { expeditionCount: parsed.expeditionCount === 6 ? 6 : 5 };
    }
    return {};
  } catch {
    return fallback;
  }
}

export function normalizeGameSpecificSettings(
  input: unknown,
  title: { normalizedTitle: string } | null | undefined,
): GameSpecificSettings {
  if (isLostCitiesTitle(title)) {
    const value = input as Partial<LostCitiesSpecificSettings> | null | undefined;
    return { expeditionCount: value?.expeditionCount === 6 ? 6 : 5 };
  }
  return {};
}

export function serializeGameSpecificSettings(settings: GameSpecificSettings) {
  return JSON.stringify(settings);
}

export function normalizeDefaultPlayerRole(value: unknown): GamePlayerRole {
  return value === "manager" || value === "self_scorer" ? value : "player";
}
