"use client";

import { createConfiguredGame } from "@/app/actions/game";
import GameTitleImage from "./game-title-image";
import GameSettingsV2Editor, { SectionBadge } from "./game-settings-v2-editor";
import {
  areAllSettingsAtTitleDefaults,
  areAllSettingsResolved,
  buildCurrentSettings,
  buildValidatedSettings,
  createEditableSettings,
  createSectionOpenState,
  createSectionTouchedState,
  getEndConditionSummary,
  getGameplaySummary,
  getInitialScoreSummary,
  getRankPointsLabel,
  getTemplateLabel,
  getWinConditionSummary,
  parsePositiveInteger,
  type EditableGameSettingsV2,
  type SectionOpenState,
  type SectionTouchedState,
} from "./game-settings-v2";
import { getProfileColorFillStyles } from "@/components/profile/profile-color-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEmpty, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type {
  GameTitleLibraryEntry,
  UnstartedGameByTitle,
} from "@/lib/db/store/game.store";
import {
  getCreateGameSettingsTitleSeed,
  parseGameSettingsV2,
  projectV2SettingsToLegacy,
  serializeGameSettingsV2,
  type CreateGameSettingsTitleSeed,
  type GameSettingsV2,
} from "@/lib/game/v2";
import { cn } from "@/lib/utils";
import { isLostCitiesTitle } from "@/lib/game/lost-cities";
import { hasCustomPlayGameV2Screen } from "@/lib/game/custom-play-screen";
import {
  normalizeDefaultPlayerRole,
  parseGameSpecificSettings,
  type GameSpecificSettings,
} from "@/lib/game/title-specific-settings";
import type { GamePlayerRole } from "@/lib/db/schema";
import {
  ArrowRight,
  CircleAlert,
  ChevronDown,
  LoaderCircle,
  Plus,
  Redo2,
  Search,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useDeferredValue,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import RankToken from "../player-rank/RankToken";

type DraftTitle =
  | { titleId: string; newTitle: null; label: string }
  | { titleId: null; newTitle: string; label: string };

type SettingsSource = "game_default" | "user_default" | "custom";

type CustomSettingsState = {
  draft: EditableGameSettingsV2;
  sectionOpen: SectionOpenState;
  sectionTouched: SectionTouchedState;
};

const MANAGEMENT_ROLE_OPTIONS = [
  {
    role: "player",
    title: "View only",
    description: "Joining players can view the game only",
  },
  {
    role: "self_scorer",
    title: "Own scores",
    description: "Joining players can edit their own score",
  },
  {
    role: "manager",
    title: "Manager",
    description: "Joining players can manage all players and scores",
  },
] as const;

function getManagementRoleLabel(role: GamePlayerRole | null) {
  return MANAGEMENT_ROLE_OPTIONS.find((option) => option.role === role)?.title;
}

function getPersonalSettings(title: GameTitleLibraryEntry | null) {
  if (title?.personalSettingsVersion !== "v2") {
    return null;
  }

  return parseGameSettingsV2(title.personalSettingsJson);
}

function getPreferredSettingsSource(
  title: GameTitleLibraryEntry | null,
): SettingsSource {
  if (
    hasCustomPlayGameV2Screen(title) &&
    title &&
    getCreateGameSettingsTitleSeed(title).source === "v2"
  ) {
    return "game_default";
  }

  if (getPersonalSettings(title)) {
    return "user_default";
  }

  if (title && getCreateGameSettingsTitleSeed(title).source === "v2") {
    return "game_default";
  }

  return "custom";
}

function getSettingsForSource(
  title: GameTitleLibraryEntry | null,
  source: SettingsSource,
) {
  if (source === "user_default") {
    return getPersonalSettings(title);
  }

  if (source === "game_default" && title) {
    const seed = getCreateGameSettingsTitleSeed(title);
    return seed.source === "v2" ? seed.settings : null;
  }

  return null;
}

function getSectionOpenState(
  seed: CreateGameSettingsTitleSeed,
  source: SettingsSource,
): SectionOpenState {
  if (source === "custom") {
    return createSectionOpenState(seed);
  }

  return {
    gameType: false,
    gameplay: false,
    winCondition: false,
    endCondition: false,
    tieBehavior: false,
    initialScore: false,
  };
}

function createEmptyCustomSettingsState(): CustomSettingsState {
  const seed = getCreateGameSettingsTitleSeed(null);
  return {
    draft: createEditableSettings(null),
    sectionOpen: getSectionOpenState(seed, "custom"),
    sectionTouched: createSectionTouchedState(),
  };
}

function normalizeTitleValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function CompletedSectionBadge({
  color,
  text,
}: {
  color?: string | null;
  text: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
        color ? "" : "bg-muted text-foreground",
      )}
      style={
        color
          ? {
              ...getProfileColorFillStyles(color),
              borderColor: color,
            }
          : undefined
      }
    >
      {text}
    </span>
  );
}

function SettingsPresetTabs({
  accentColor,
  hasGameDefaults,
  hasPersonalDefaults,
  onSelect,
  value,
}: {
  accentColor?: string | null;
  hasGameDefaults: boolean;
  hasPersonalDefaults: boolean;
  onSelect: (source: SettingsSource) => void;
  value: SettingsSource;
}) {
  const options = [
    hasGameDefaults
      ? { label: "Game defaults", value: "game_default" as const }
      : null,
    hasPersonalDefaults
      ? { label: "My defaults", value: "user_default" as const }
      : null,
    { label: "Custom", value: "custom" as const },
  ].filter((option): option is NonNullable<typeof option> => Boolean(option));

  return (
    <div
      aria-label="Settings presets"
      className="grid w-full grid-flow-col auto-cols-fr rounded-xl border bg-background/55 p-1 shadow-inner backdrop-blur-sm"
      role="tablist"
      style={
        accentColor
          ? {
              borderColor: `color-mix(in srgb, ${accentColor} 32%, var(--border))`,
              backgroundColor: `color-mix(in srgb, ${accentColor} 8%, var(--background))`,
            }
          : undefined
      }
    >
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            aria-selected={selected}
            className={cn(
              "rounded-lg px-2 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              selected
                ? accentColor
                  ? "shadow-sm"
                  : "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
            )}
            onClick={() => onSelect(option.value)}
            role="tab"
            style={
              selected && accentColor
                ? {
                    ...getProfileColorFillStyles(accentColor),
                    boxShadow: `0 6px 16px -10px ${accentColor}`,
                  }
                : undefined
            }
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AnimatedDropdownContent({
  children,
  open,
}: {
  children: ReactNode;
  open: boolean;
}) {
  return (
    <div
      aria-hidden={!open}
      className={cn(
        "grid transition-all duration-300 ease-out",
        open
          ? "visible grid-rows-[1fr] opacity-100"
          : "invisible grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function PersonalSettingsCard({
  title,
  description,
  summary,
  summaryColor,
  open,
  onToggle,
  children,
}: {
  title: string;
  description?: string;
  summary?: string | null;
  summaryColor?: string | null;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Card
      className="gap-0 overflow-visible border-0 p-0 ring-0"
      surface="plain"
    >
      <CardHeader className="gap-0 p-0">
        <button
          aria-expanded={open}
          className={cn(
            "flex w-full items-start justify-between gap-3 rounded-t-2xl border px-4 py-4 text-left transition",
            !open && "rounded-b-2xl",
          )}
          onClick={onToggle}
          type="button"
        >
          <div className="space-y-2">
            <h2 className="text-lg font-bold">{title}</h2>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
            {summary && (
              <div className="flex flex-wrap gap-2 pt-1">
                <CompletedSectionBadge color={summaryColor} text={summary} />
              </div>
            )}
          </div>
          <ChevronDown
            className={cn(
              "mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
              open && "rotate-180",
            )}
          />
        </button>
      </CardHeader>
      <AnimatedDropdownContent open={open}>
        <CardContent className="space-y-4 pt-4 pb-4">{children}</CardContent>
      </AnimatedDropdownContent>
    </Card>
  );
}

function PersonalSettingsSection({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-muted/50 transition">
      <button
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={onToggle}
        type="button"
      >
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatedDropdownContent open={open}>
        <div className="space-y-2 border-t border-border px-4 py-4">
          {children}
        </div>
      </AnimatedDropdownContent>
    </div>
  );
}

function PersonalSettingsOption({
  title,
  description,
  selected,
  onClick,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`${title}. ${description}`}
      aria-pressed={selected}
      className={cn(
        "w-full rounded-xl border p-4 text-left transition",
        selected
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border bg-card text-foreground hover:bg-muted",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="block font-black">{title}</span>
      <span className="mt-1 block text-sm opacity-80">{description}</span>
    </button>
  );
}

export default function CreateGameSettingsStep({
  allGameTitles,
  currentUserColor,
  initialSelectedTitle,
  initialNewTitle,
  suggestedGameTitles,
  unstartedGamesByTitle = [],
}: {
  allGameTitles: GameTitleLibraryEntry[];
  currentUserColor?: string | null;
  initialSelectedTitle: GameTitleLibraryEntry | null;
  initialNewTitle: string | null;
  suggestedGameTitles: GameTitleLibraryEntry[];
  unstartedGamesByTitle?: UnstartedGameByTitle[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const initialUnstartedGame = initialSelectedTitle
    ? unstartedGamesByTitle.find(
        (game) => game.gameTitleId === initialSelectedTitle.id,
      )
    : undefined;
  const [selectedTitle, setSelectedTitle] =
    useState<GameTitleLibraryEntry | null>(
      initialUnstartedGame ? null : initialSelectedTitle,
    );
  const [selectedNewTitle, setSelectedNewTitle] = useState(
    initialSelectedTitle ? null : initialNewTitle?.trim() || null,
  );
  const [searchValue, setSearchValue] = useState("");
  const deferredSearchValue = useDeferredValue(searchValue);
  const initialSettingsSource =
    getPreferredSettingsSource(initialSelectedTitle);
  const [settingsSource, setSettingsSource] = useState<SettingsSource>(
    initialSettingsSource,
  );
  const [settingsDraft, setSettingsDraft] = useState<EditableGameSettingsV2>(
    () =>
      createEditableSettings(
        getSettingsForSource(initialSelectedTitle, initialSettingsSource),
      ),
  );
  const [sectionOpen, setSectionOpen] = useState<SectionOpenState>(() =>
    getSectionOpenState(
      getCreateGameSettingsTitleSeed(initialSelectedTitle),
      initialSettingsSource,
    ),
  );
  const [sectionTouched, setSectionTouched] = useState<SectionTouchedState>(
    () => createSectionTouchedState(initialSettingsSource !== "custom"),
  );
  const settingsDraftRef = useRef(settingsDraft);
  const sectionTouchedRef = useRef(sectionTouched);
  const [customSettingsState, setCustomSettingsState] =
    useState<CustomSettingsState>(() => createEmptyCustomSettingsState());
  const [settingsCardOpen, setSettingsCardOpen] = useState(
    initialSettingsSource === "custom",
  );
  const [gameSpecificSettings, setGameSpecificSettings] =
    useState<GameSpecificSettings>(() =>
      parseGameSpecificSettings(
        initialSelectedTitle?.personalGameSpecificSettingsJson,
        initialSelectedTitle,
      ),
    );
  const [defaultPlayerRole, setDefaultPlayerRole] = useState<GamePlayerRole>(
    () =>
      initialSelectedTitle?.personalDefaultPlayerRole
        ? normalizeDefaultPlayerRole(
            initialSelectedTitle.personalDefaultPlayerRole,
          )
        : "player",
  );
  const [gameSettingsCardOpen, setGameSettingsCardOpen] = useState(false);
  const [gameSettingsSectionOpen, setGameSettingsSectionOpen] = useState(false);
  const [managementCardOpen, setManagementCardOpen] = useState(false);
  const [managementSectionOpen, setManagementSectionOpen] = useState(false);
  const [duplicateTitle, setDuplicateTitle] =
    useState<GameTitleLibraryEntry | null>(
      initialUnstartedGame ? initialSelectedTitle : null,
    );

  const isChoosingTitle = !selectedTitle && !selectedNewTitle;
  const trimmedSearchValue = searchValue.trim();
  const normalizedSearchValue = normalizeTitleValue(deferredSearchValue);
  const searchResults = useMemo(() => {
    if (!normalizedSearchValue || !isChoosingTitle) {
      return [];
    }

    return allGameTitles
      .filter((title) =>
        [title.title, title.normalizedTitle].some((value) =>
          value.toLowerCase().includes(normalizedSearchValue),
        ),
      )
      .slice(0, 8);
  }, [allGameTitles, isChoosingTitle, normalizedSearchValue]);

  const hasExactSearchMatch = useMemo(
    () =>
      searchResults.some(
        (title) => title.normalizedTitle === normalizedSearchValue,
      ),
    [normalizedSearchValue, searchResults],
  );
  const showSuggestedGrid = !normalizedSearchValue;
  const visibleTitles = normalizedSearchValue
    ? searchResults
    : suggestedGameTitles;
  const draftTitle = useMemo<DraftTitle | null>(() => {
    if (selectedTitle) {
      return {
        titleId: selectedTitle.id,
        newTitle: null,
        label: selectedTitle.title,
      };
    }

    if (selectedNewTitle) {
      return {
        titleId: null,
        newTitle: selectedNewTitle,
        label: selectedNewTitle,
      };
    }

    return null;
  }, [selectedNewTitle, selectedTitle]);

  const titleSeed = useMemo(
    () => getCreateGameSettingsTitleSeed(selectedTitle),
    [selectedTitle],
  );
  const activeSettingsSeed = useMemo(
    () =>
      settingsSource === "game_default"
        ? titleSeed
        : getCreateGameSettingsTitleSeed(null),
    [settingsSource, titleSeed],
  );
  const currentSettings = useMemo(
    () => buildCurrentSettings(settingsDraft),
    [settingsDraft],
  );
  const rankPointsLabel = useMemo(
    () => getRankPointsLabel(settingsDraft),
    [settingsDraft],
  );
  const allSettingsAtDefaults = useMemo(
    () =>
      settingsSource === "game_default" &&
      areAllSettingsAtTitleDefaults({
        seed: titleSeed,
        currentSettings,
      }),
    [currentSettings, settingsSource, titleSeed],
  );
  const allSettingsResolved = useMemo(
    () =>
      areAllSettingsResolved({
        seed: activeSettingsSeed,
        currentSettings,
        settingsDraft,
        touched: sectionTouched,
      }),
    [activeSettingsSeed, currentSettings, sectionTouched, settingsDraft],
  );
  const noSettingsSelected =
    settingsSource === "custom" &&
    Object.values(sectionTouched).every((isTouched) => !isTouched);
  const settingsAccentColor =
    settingsSource === "game_default"
      ? selectedTitle?.color
      : currentUserColor;
  const hasCustomPlayScreen = hasCustomPlayGameV2Screen(selectedTitle);
  function replaceTitleParams(nextParams: {
    titleId?: string | null;
    newTitle?: string | null;
  }) {
    const params = new URLSearchParams(searchParams.toString());

    params.delete("titleId");
    params.delete("newTitle");

    if (nextParams.titleId) {
      params.set("titleId", nextParams.titleId);
    }

    if (nextParams.newTitle) {
      params.set("newTitle", nextParams.newTitle);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }

  function applySettingsSeed(
    seed: CreateGameSettingsTitleSeed,
    source: SettingsSource,
    settings: GameSettingsV2 | null,
  ) {
    const nextDraft = createEditableSettings(settings);
    const nextTouched = createSectionTouchedState(source !== "custom");
    setSettingsSource(source);
    settingsDraftRef.current = nextDraft;
    setSettingsDraft(nextDraft);
    setSectionOpen(getSectionOpenState(seed, source));
    sectionTouchedRef.current = nextTouched;
    setSectionTouched(nextTouched);
    setSettingsCardOpen(source === "custom");
  }

  function applyLibraryTitle(title: GameTitleLibraryEntry) {
    setSelectedTitle(title);
    setSelectedNewTitle(null);
    const source = getPreferredSettingsSource(title);
    applySettingsSeed(
      getCreateGameSettingsTitleSeed(title),
      source,
      getSettingsForSource(title, source),
    );
    setCustomSettingsState(createEmptyCustomSettingsState());
    setSearchValue("");
    setGameSpecificSettings(
      parseGameSpecificSettings(title.personalGameSpecificSettingsJson, title),
    );
    setDefaultPlayerRole(
      title.personalDefaultPlayerRole
        ? normalizeDefaultPlayerRole(title.personalDefaultPlayerRole)
        : "player",
    );
    setGameSettingsCardOpen(false);
    setGameSettingsSectionOpen(false);
    setManagementCardOpen(false);
    setManagementSectionOpen(false);
    replaceTitleParams({ titleId: title.id, newTitle: null });
  }

  function selectLibraryTitle(title: GameTitleLibraryEntry) {
    const unstartedGame = unstartedGamesByTitle.find(
      (game) => game.gameTitleId === title.id,
    );

    if (unstartedGame) {
      setDuplicateTitle(title);
      return;
    }

    applyLibraryTitle(title);
  }

  const duplicateGame = duplicateTitle
    ? unstartedGamesByTitle.find(
        (game) => game.gameTitleId === duplicateTitle.id,
      )
    : undefined;

  function selectNewTitle(title: string) {
    const normalizedTitle = title.trim().replace(/\s+/g, " ");

    if (!normalizedTitle) {
      return;
    }

    setSelectedTitle(null);
    setSelectedNewTitle(normalizedTitle);
    setCustomSettingsState(createEmptyCustomSettingsState());
    applySettingsSeed(getCreateGameSettingsTitleSeed(null), "custom", null);
    setSearchValue("");
    setGameSpecificSettings({});
    setDefaultPlayerRole("player");
    setManagementCardOpen(false);
    setManagementSectionOpen(false);
    replaceTitleParams({ titleId: null, newTitle: normalizedTitle });
  }

  function resetSelection() {
    setSelectedTitle(null);
    setSelectedNewTitle(null);
    setCustomSettingsState(createEmptyCustomSettingsState());
    applySettingsSeed(getCreateGameSettingsTitleSeed(null), "custom", null);
    setSearchValue("");
    setGameSpecificSettings({});
    setDefaultPlayerRole("player");
    setGameSettingsCardOpen(false);
    setGameSettingsSectionOpen(false);
    setManagementCardOpen(false);
    setManagementSectionOpen(false);
    replaceTitleParams({ titleId: null, newTitle: null });
  }

  function selectSettingsSource(nextSource: SettingsSource) {
    if (nextSource === settingsSource) {
      return;
    }

    if (nextSource === "custom") {
      setSettingsSource("custom");
      settingsDraftRef.current = customSettingsState.draft;
      setSettingsDraft(customSettingsState.draft);
      setSectionOpen(customSettingsState.sectionOpen);
      sectionTouchedRef.current = customSettingsState.sectionTouched;
      setSectionTouched(customSettingsState.sectionTouched);
      setSettingsCardOpen(
        !areDraftSettingsResolved(
          customSettingsState.draft,
          customSettingsState.sectionTouched,
        ),
      );
      return;
    }

    if (settingsSource === "custom") {
      setCustomSettingsState({
        draft: settingsDraft,
        sectionOpen,
        sectionTouched,
      });
    }

    const settings = getSettingsForSource(selectedTitle, nextSource);
    if (!settings) {
      return;
    }

    const nextDraft = createEditableSettings(settings);
    const nextTouched = createSectionTouchedState(true);
    setSettingsSource(nextSource);
    settingsDraftRef.current = nextDraft;
    setSettingsDraft(nextDraft);
    sectionTouchedRef.current = nextTouched;
    setSectionTouched(nextTouched);
    setSectionOpen(
      Object.fromEntries(
        Object.keys(sectionOpen).map((key) => [key, false]),
      ) as SectionOpenState,
    );
    setSettingsCardOpen(true);
  }

  function areDraftSettingsResolved(
    draft: EditableGameSettingsV2,
    touched: SectionTouchedState,
  ) {
    return areAllSettingsResolved({
      seed: getCreateGameSettingsTitleSeed(null),
      currentSettings: buildCurrentSettings(draft),
      settingsDraft: draft,
      touched,
    });
  }

  function getMatchingSettingsSource(
    nextDraft: EditableGameSettingsV2,
    nextTouched: SectionTouchedState,
  ): Exclude<SettingsSource, "custom"> | null {
    if (!areDraftSettingsResolved(nextDraft, nextTouched)) {
      return null;
    }

    try {
      const nextSettings = buildValidatedSettings(nextDraft);
      const personalSettings = getPersonalSettings(selectedTitle);
      const gameSettings =
        titleSeed.source === "v2" ? titleSeed.settings : null;
      return personalSettings &&
        serializeGameSettingsV2(nextSettings) ===
          serializeGameSettingsV2(personalSettings)
        ? "user_default"
        : gameSettings &&
            serializeGameSettingsV2(nextSettings) ===
              serializeGameSettingsV2(gameSettings)
          ? "game_default"
          : null;
    } catch {
      return null;
    }
  }

  function activateMatchingSettingsSource(
    matchingSource: Exclude<SettingsSource, "custom">,
    customDraft: EditableGameSettingsV2,
    customTouched: SectionTouchedState,
  ) {
    const personalSettings = getPersonalSettings(selectedTitle);
    const gameSettings = titleSeed.source === "v2" ? titleSeed.settings : null;
    const matchingSettings =
      matchingSource === "user_default" ? personalSettings : gameSettings;
    if (!matchingSettings) {
      return;
    }

    const presetDraft = createEditableSettings(matchingSettings);
    const presetTouched = createSectionTouchedState(true);
    setCustomSettingsState({
      draft: customDraft,
      sectionOpen,
      sectionTouched: customTouched,
    });
    setSettingsSource(matchingSource);
    settingsDraftRef.current = presetDraft;
    setSettingsDraft(presetDraft);
    sectionTouchedRef.current = presetTouched;
    setSectionTouched(presetTouched);
    setSectionOpen(
      Object.fromEntries(
        Object.keys(sectionOpen).map((key) => [key, false]),
      ) as SectionOpenState,
    );
    setSettingsCardOpen(false);
  }

  function handleSettingsDraftChange(nextDraft: EditableGameSettingsV2) {
    settingsDraftRef.current = nextDraft;
    setCustomSettingsState((current) => ({
      ...current,
      draft: nextDraft,
    }));

    const matchingSource = getMatchingSettingsSource(
      nextDraft,
      sectionTouchedRef.current,
    );
    if (matchingSource) {
      activateMatchingSettingsSource(
        matchingSource,
        nextDraft,
        sectionTouchedRef.current,
      );
      return;
    }

    setSettingsSource("custom");
    setSettingsDraft(nextDraft);
    if (areDraftSettingsResolved(nextDraft, sectionTouchedRef.current)) {
      setSettingsCardOpen(false);
    }
  }

  function handleSectionTouchedChange(nextTouched: SectionTouchedState) {
    sectionTouchedRef.current = nextTouched;
    setSectionTouched(nextTouched);

    const currentDraft = settingsDraftRef.current;
    const matchingSource = getMatchingSettingsSource(currentDraft, nextTouched);
    if (matchingSource) {
      activateMatchingSettingsSource(matchingSource, currentDraft, nextTouched);
      return;
    }

    if (areDraftSettingsResolved(currentDraft, nextTouched)) {
      setSettingsCardOpen(false);
    }
  }

  function handleCreateGame() {
    if (!draftTitle) {
      toast.error("Choose a title first");
      return;
    }

    if (
      settingsDraft.gameplayMode === "rounds" &&
      settingsDraft.endConditionMode === "fixed_rounds" &&
      !parsePositiveInteger(settingsDraft.targetRounds)
    ) {
      toast.error("Choose how many rounds the game should target");
      return;
    }

    if (
      settingsDraft.gameplayMode === "rounds" &&
      settingsDraft.endConditionMode === "score_threshold" &&
      !parsePositiveInteger(settingsDraft.thresholdValue)
    ) {
      toast.error("Choose a score threshold");
      return;
    }

    let settingsV2: GameSettingsV2;

    try {
      settingsV2 = buildValidatedSettings(settingsDraft);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not validate settings",
      );
      return;
    }

    const legacySettings = projectV2SettingsToLegacy(settingsV2);

    startTransition(async () => {
      try {
        const game = await createConfiguredGame({
          gameTitleId: draftTitle.titleId,
          gameTitleName: draftTitle.newTitle,
          scoringMode: legacySettings.scoringMode,
          endingMode: legacySettings.endingMode,
          trackRounds: legacySettings.trackRounds,
          targetRounds: legacySettings.targetRounds,
          scoreThreshold: legacySettings.scoreThreshold,
          scoreThresholdDirection: legacySettings.scoreThresholdDirection,
          version: "v2",
          settingsV2,
          settingsSource,
          gameSpecificSettings,
          managementSettings: { defaultPlayerRole },
        });

        router.push(`/game/${game.id}/play`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not create game",
        );
      }
    });
  }

  return (
    <>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setDuplicateTitle(null);
            if (initialUnstartedGame) {
              replaceTitleParams({ titleId: null, newTitle: null });
            }
          }
        }}
        open={Boolean(duplicateTitle)}
      >
        <DialogContent className="rounded-xl p-0 sm:max-w-md">
          <div className="p-6">
            <DialogHeader className="gap-3">
              <DialogTitle className="text-2xl font-black">
                Game already started
              </DialogTitle>
              <DialogDescription className="text-base">
                You already have a{" "}
                <span className="font-semibold text-foreground">
                  {duplicateTitle?.title}
                </span>{" "}
                game that hasn&apos;t started scoring or progressed through any
                rounds.
              </DialogDescription>
            </DialogHeader>
          </div>
          <DialogFooter className="rounded-b-xl">
            <Button
              onClick={() => {
                if (!duplicateTitle) {
                  return;
                }

                const title = duplicateTitle;
                setDuplicateTitle(null);
                applyLibraryTitle(title);
              }}
              type="button"
              variant="outline"
            >
              Create new game
            </Button>
            <Button
              disabled={!duplicateGame}
              onClick={() => {
                if (duplicateGame) {
                  router.push(`/game/${duplicateGame.gameId}/play`);
                }
              }}
              type="button"
            >
              Go to existing game
              <ArrowRight className="size-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen overflow-y-auto px-4 pb-24">
        <div className="mx-auto flex w-full max-w-md flex-col gap-6">
          <div className="space-y-1">
            {!selectedTitle ? (
              <>
                <h1 className="text-4xl font-black">Choose game</h1>
                <p className="pl-1 text-sm text-muted-foreground">
                  Search for a game title or create your own
                </p>
              </>
            ) : (
              <>
                <h1 className="text-4xl font-black">Game Settings</h1>
                <p className="pl-1 text-sm text-muted-foreground">
                  Configure the gameplay settings
                </p>
              </>
            )}
          </div>

          {isChoosingTitle ? (
            <div className="flex flex-col gap-4">
              <div className="relative bg-card">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-12 rounded-xl pl-12 pr-4 text-sm"
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search or create a game"
                  value={searchValue}
                />
              </div>

              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {normalizedSearchValue ? "Matches" : "Suggested games"}
                  </p>
                </div>

                <Separator />

                <div className="p-4">
                  {visibleTitles.length === 0 && !trimmedSearchValue ? (
                    <CardEmpty className="border-0 bg-transparent py-8">
                      No saved or shared titles yet. Search above to create your
                      first one.
                    </CardEmpty>
                  ) : showSuggestedGrid ? (
                    <div className="grid grid-cols-2 auto-rows-28 gap-3">
                      {visibleTitles.map((title, index) => {
                        const isFeatured =
                          visibleTitles.length >= 4 &&
                          index === visibleTitles.length - 1;

                        return (
                          <button
                            key={title.id}
                            className={cn(
                              "rounded-xl text-left transition hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-ring",
                              isFeatured && "col-span-2",
                            )}
                            onClick={() => selectLibraryTitle(title)}
                            type="button"
                          >
                            <GameTitleImage
                              className="flex items-end p-4"
                              color={title.color}
                              imageUrl={title.imageUrl}
                              size="md"
                              verticalFocus={title.imageVerticalFocus}
                            >
                              <div className="flex w-full flex-col items-start justify-end gap-1">
                                <p
                                  className={cn(
                                    "line-clamp-2 font-black text-white",
                                    isFeatured ? "text-lg" : "text-base",
                                  )}
                                >
                                  {title.title}
                                </p>
                              </div>
                            </GameTitleImage>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {visibleTitles.map((title) => (
                        <button
                          key={title.id}
                          className="rounded-xl text-left transition hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => selectLibraryTitle(title)}
                          type="button"
                        >
                          <GameTitleImage
                            className="p-4"
                            color={title.color}
                            imageUrl={title.imageUrl}
                            size="sm"
                            verticalFocus={title.imageVerticalFocus}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-base font-black text-white">
                                {title.title}
                              </p>
                              <Badge className="border-white/15 bg-white/12 text-white hover:bg-white/12">
                                {title.isOwned
                                  ? "My game"
                                  : title.accessSource === "universal"
                                    ? "Community Game"
                                    : "Shared with you"}
                              </Badge>
                            </div>
                          </GameTitleImage>
                        </button>
                      ))}

                      {trimmedSearchValue && !hasExactSearchMatch ? (
                        <button
                          className="flex items-center justify-between rounded-xl border border-dashed border-border bg-background px-4 py-3 text-left transition hover:bg-muted"
                          onClick={() => selectNewTitle(trimmedSearchValue)}
                          type="button"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              Create &quot;{trimmedSearchValue}&quot;
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Start a new title with this name
                            </p>
                          </div>
                          <Plus className="size-5 text-muted-foreground" />
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {draftTitle ? (
            <>
              <button
                className={cn(
                  "w-full rounded-xl text-left transition focus-visible:ring-2 focus-visible:ring-ring",
                  selectedTitle ? "hover:scale-[1.01]" : "hover:bg-muted",
                )}
                onClick={resetSelection}
                type="button"
              >
                <Card
                  className="overflow-visible rounded-xl border-0 p-0 ring-0 shadow-sm"
                  style={{
                    ["--game-header-accent" as string]:
                      selectedTitle?.color ?? "#64748b",
                  }}
                >
                  <GameTitleImage
                    className="w-full"
                    color={selectedTitle?.color}
                    contentClassName="px-4 py-3.5"
                    imageUrl={selectedTitle?.imageUrl}
                    size="lg"
                    verticalFocus={selectedTitle?.imageVerticalFocus}
                    variant="card"
                  >
                    <div className="relative flex h-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h1
                          className={cn(
                            "truncate text-2xl font-black tracking-tight",
                            selectedTitle ? "text-white" : "text-foreground",
                          )}
                        >
                          {selectedTitle
                            ? selectedTitle.title
                            : draftTitle.label}
                        </h1>
                        <p
                          className={cn(
                            "mt-1 text-xs font-semibold uppercase tracking-[0.16em]",
                            selectedTitle
                              ? "text-white/72"
                              : "text-muted-foreground",
                          )}
                        >
                          {draftTitle.titleId ? "Selected" : "New title"} · Tap
                          to change
                        </p>
                      </div>
                      <div
                        className={cn(
                          "shrink-0 rounded-full border p-2 backdrop-blur-sm",
                          selectedTitle
                            ? "border-white/20 bg-white/15 text-white"
                            : "border-border bg-background/80 text-muted-foreground",
                        )}
                      >
                        <Redo2 className="size-5" />
                      </div>
                    </div>
                  </GameTitleImage>
                </Card>
              </button>

              {allSettingsResolved ? (
                <div className="winner-surface rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <RankToken size="lg" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{rankPointsLabel}</p>
                      <p className="text-sm winner-muted">
                        {settingsDraft.template === "elimination"
                          ? "Elimination games record placements as players are knocked out."
                          : "The current game settings allow top 3 podium finishers to earn Rank points"}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              <Card
                className="gap-0 overflow-visible border-0 p-0 ring-0"
                surface="plain"
              >
                <CardHeader className="gap-0 p-0">
                  <div
                    className={cn(
                      "cursor-pointer rounded-t-2xl border transition",
                      !settingsCardOpen && "rounded-b-2xl",
                    )}
                    onClick={(event) => {
                      if ((event.target as Element).closest('[role="tab"]')) {
                        return;
                      }

                      setSettingsCardOpen((current) => !current);
                    }}
                    style={
                      allSettingsResolved &&
                      (allSettingsAtDefaults
                        ? selectedTitle?.color
                        : currentUserColor)
                        ? {
                            ...(allSettingsAtDefaults
                              ? {
                                  borderColor: selectedTitle?.color,
                                  backgroundColor: `color-mix(in srgb, ${selectedTitle?.color} 18%, var(--card))`,
                                  boxShadow: `0 18px 34px -30px ${selectedTitle?.color}`,
                                }
                              : {
                                  borderColor: `color-mix(in srgb, ${currentUserColor ?? "#64748b"} 42%, var(--border))`,
                                  backgroundColor: `color-mix(in srgb, ${currentUserColor ?? "#64748b"} 18%, var(--card))`,
                                  boxShadow: `0 18px 34px -30px ${currentUserColor ?? "#64748b"}`,
                                }),
                          }
                        : undefined
                    }
                  >
                    <button
                      aria-expanded={settingsCardOpen}
                      className="flex w-full items-start justify-between gap-3 px-4 pt-4 pb-3 text-left"
                      type="button"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold">Gameplay</h2>
                        <SectionBadge
                          color={
                            allSettingsAtDefaults
                              ? selectedTitle?.color
                              : noSettingsSelected
                                ? undefined
                                : currentUserColor
                          }
                          text={
                            allSettingsAtDefaults
                              ? "Game defaults"
                              : settingsSource === "user_default"
                                ? "My defaults"
                                : noSettingsSelected &&
                                    titleSeed.source !== "v2"
                                  ? "No community defaults"
                                  : "Custom settings"
                          }
                        />
                      </div>
                      <ChevronDown
                        className={cn(
                          "mt-1 size-5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
                          settingsCardOpen && "rotate-180",
                        )}
                      />
                    </button>

                    <div className="space-y-3 px-4 pt-3 pb-4">
                      <SettingsPresetTabs
                        accentColor={settingsAccentColor}
                        hasGameDefaults={
                          Boolean(selectedTitle) && titleSeed.source === "v2"
                        }
                        hasPersonalDefaults={Boolean(
                          selectedTitle && getPersonalSettings(selectedTitle),
                        )}
                        onSelect={selectSettingsSource}
                        value={settingsSource}
                      />
                      {hasCustomPlayScreen ? (
                        <Alert
                          className={cn(
                            "px-4 py-3",
                            settingsSource === "game_default"
                              ? "border-sky-500/35 bg-sky-500/5 text-sky-800 dark:text-sky-200"
                              : "border-destructive/40 bg-destructive/5",
                          )}
                          variant={
                            settingsSource === "game_default"
                              ? "default"
                              : "destructive"
                          }
                        >
                          <CircleAlert />
                          <AlertTitle>
                            {settingsSource === "game_default"
                              ? "Custom play screen available"
                              : "Custom play screen unavailable"}
                          </AlertTitle>
                          <AlertDescription>
                            {settingsSource === "game_default"
                              ? `${selectedTitle?.title} has a custom play screen. Keep Game defaults selected to use it.`
                              : "These settings will use the standard play screen. Switch back to Game defaults to use this title’s custom screen."}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      {!allSettingsResolved ? (
                        <p className="text-sm text-muted-foreground">
                          Choose your game settings.
                        </p>
                      ) : null}
                      {allSettingsResolved ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <CompletedSectionBadge
                            color={
                              allSettingsAtDefaults
                                ? selectedTitle?.color
                                : currentUserColor
                            }
                            text={getTemplateLabel(settingsDraft.template)}
                          />
                          <CompletedSectionBadge
                            color={
                              allSettingsAtDefaults
                                ? selectedTitle?.color
                                : currentUserColor
                            }
                            text={getGameplaySummary(settingsDraft)}
                          />
                          <CompletedSectionBadge
                            color={
                              allSettingsAtDefaults
                                ? selectedTitle?.color
                                : currentUserColor
                            }
                            text={getWinConditionSummary(settingsDraft)}
                          />
                          {settingsDraft.gameplayMode === "rounds" ? (
                            <CompletedSectionBadge
                              color={
                                allSettingsAtDefaults
                                  ? selectedTitle?.color
                                  : currentUserColor
                              }
                              text={getEndConditionSummary(settingsDraft)}
                            />
                          ) : null}
                          {settingsDraft.template === "point_scoring" ? (
                            <CompletedSectionBadge
                              color={
                                allSettingsAtDefaults
                                  ? selectedTitle?.color
                                  : currentUserColor
                              }
                              text={getInitialScoreSummary(settingsDraft)}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <AnimatedDropdownContent open={settingsCardOpen}>
                  <CardContent className="space-y-4 pt-4 pb-4">
                    <GameSettingsV2Editor
                      currentSettings={currentSettings}
                      defaultColor={selectedTitle?.color}
                      defaultIndicatorSeed={titleSeed}
                      draft={settingsDraft}
                      itemizedMode="editor"
                      onDraftChange={handleSettingsDraftChange}
                      onSectionOpenChange={setSectionOpen}
                      onSectionTouchedChange={handleSectionTouchedChange}
                      sectionOpen={sectionOpen}
                      sectionTouched={sectionTouched}
                      selectedColor={currentUserColor}
                      titleSeed={activeSettingsSeed}
                    />
                  </CardContent>
                </AnimatedDropdownContent>
              </Card>

              {selectedTitle && isLostCitiesTitle(selectedTitle) ? (
                <PersonalSettingsCard
                  onToggle={() =>
                    setGameSettingsCardOpen((current) => !current)
                  }
                  open={gameSettingsCardOpen}
                  summary={
                    "expeditionCount" in gameSpecificSettings
                      ? `${gameSpecificSettings.expeditionCount} expeditions`
                      : null
                  }
                  summaryColor={currentUserColor}
                  title={`${selectedTitle.title} settings`}
                >
                  <PersonalSettingsSection
                    onToggle={() =>
                      setGameSettingsSectionOpen((current) => !current)
                    }
                    open={gameSettingsSectionOpen}
                    summary={
                      "expeditionCount" in gameSpecificSettings
                        ? `${gameSpecificSettings.expeditionCount} expeditions selected`
                        : "Choose the number of expeditions"
                    }
                    title="Expeditions"
                  >
                    {([5, 6] as const).map((expeditionCount) => (
                      <PersonalSettingsOption
                        key={expeditionCount}
                        description={
                          expeditionCount === 5
                            ? "Play without the Purple expedition"
                            : "Play with all six expeditions"
                        }
                        onClick={() => {
                          setGameSpecificSettings({ expeditionCount });
                          setGameSettingsSectionOpen(false);
                          setGameSettingsCardOpen(false);
                        }}
                        selected={
                          "expeditionCount" in gameSpecificSettings &&
                          gameSpecificSettings.expeditionCount ===
                            expeditionCount
                        }
                        title={`${expeditionCount} expeditions`}
                      />
                    ))}
                  </PersonalSettingsSection>
                </PersonalSettingsCard>
              ) : null}

              <PersonalSettingsCard
                onToggle={() => {
                  setManagementCardOpen((current) => !current);
                }}
                open={managementCardOpen}
                summary={getManagementRoleLabel(defaultPlayerRole)}
                summaryColor={currentUserColor}
                title="Management"
              >
                <PersonalSettingsSection
                  onToggle={() =>
                    setManagementSectionOpen((current) => !current)
                  }
                  open={managementSectionOpen}
                  summary={`${getManagementRoleLabel(defaultPlayerRole)} selected`}
                  title="Default player permissions"
                >
                  {MANAGEMENT_ROLE_OPTIONS.map((option) => (
                    <PersonalSettingsOption
                      key={option.role}
                      description={option.description}
                      onClick={() => {
                        setDefaultPlayerRole(option.role);
                        setManagementSectionOpen(false);
                        setManagementCardOpen(false);
                      }}
                      selected={defaultPlayerRole === option.role}
                      title={option.title}
                    />
                  ))}
                </PersonalSettingsSection>
              </PersonalSettingsCard>

              <div className="flex flex-col gap-2">
                <Button
                  className="h-14 rounded-xl"
                  disabled={isPending || !allSettingsResolved}
                  onClick={handleCreateGame}
                  type="button"
                >
                  {isPending ? <LoaderCircle className="animate-spin" /> : null}
                  Start game
                  <ArrowRight className="size-5" />
                </Button>
                {!allSettingsResolved ? (
                  <p className="text-center text-xs">
                    Configure all settings before starting the game
                  </p>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
