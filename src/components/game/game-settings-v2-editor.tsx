"use client";

import { getProfileColorFillStyles } from "@/components/profile/profile-color-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createEditableCategory,
  getCategoryPreview,
  getEndConditionSummary,
  getGameplaySummary,
  getInitialScoreSummary,
  getSectionStatusLabel,
  getTemplateLabel,
  getWinConditionSummary,
  isDefaultRoundsValue,
  isDefaultTemplateOption,
  isDefaultThresholdValue,
  isDefaultWinMetricOption,
  isInitialScoreResolved,
  isInitialScoreUsingTitleDefault,
  isSectionResolved,
  isSectionUsingTitleDefault,
  parsePositiveInteger,
  type EditableGameSettingsV2,
  type EditableItemizedCategory,
  type SectionOpenState,
  type SectionTouchedState,
  GAME_SCORING_OPTIONS,
  usesNumericScoring,
} from "./game-settings-v2";
import { cn } from "@/lib/utils";
import type {
  CreateGameSettingsSection,
  CreateGameSettingsTitleSeed,
  GameSettingsV2,
} from "@/lib/game/v2";
import { Check, ChevronDown } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

function getTitleAccentStyle(color?: string | null) {
  if (!color) {
    return undefined;
  }

  return {
    borderColor: color,
    color,
  };
}

function getDefaultOptionStyle(input: {
  activeColor?: string | null;
  defaultColor?: string | null;
  active: boolean;
  isDefault: boolean;
}) {
  if (input.active) {
    if (!input.activeColor) {
      return undefined;
    }

    return {
      ...getProfileColorFillStyles(input.activeColor),
      borderColor: input.activeColor,
      boxShadow: `0 14px 30px -20px ${input.activeColor}`,
    };
  }

  if (!input.isDefault || !input.defaultColor) {
    return undefined;
  }

  return {
    borderColor: `color-mix(in srgb, ${input.defaultColor} 36%, var(--border))`,
    backgroundColor: `color-mix(in srgb, ${input.defaultColor} 10%, var(--card))`,
  };
}

function getSelectionAccentColor(input: {
  active: boolean;
  isDefault: boolean;
  selectedColor?: string | null;
  defaultColor?: string | null;
}) {
  if (!input.active) {
    return undefined;
  }

  return input.isDefault ? input.defaultColor : input.selectedColor;
}

function getSectionAccentColor(input: {
  section: CreateGameSettingsSection;
  seed: CreateGameSettingsTitleSeed;
  defaultSeed: CreateGameSettingsTitleSeed;
  currentSettings: GameSettingsV2;
  settingsDraft: EditableGameSettingsV2;
  touched: SectionTouchedState;
  defaultColor?: string | null;
  selectedColor?: string | null;
}) {
  if (
    isSectionUsingTitleDefault({
      section: input.section,
      seed: input.defaultSeed,
      currentSettings: input.currentSettings,
    })
  ) {
    return input.defaultColor;
  }

  if (
    isSectionResolved({
      section: input.section,
      seed: input.seed,
      currentSettings: input.currentSettings,
      settingsDraft: input.settingsDraft,
      touched: input.touched,
    })
  ) {
    return input.selectedColor;
  }

  return undefined;
}

function CompletedSectionBadge({ color }: { color?: string | null }) {
  return (
    <span
      aria-label="Setting selected"
      className={cn(
        "inline-flex size-6 shrink-0 items-center justify-center rounded-full border",
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
      <Check className="size-3.5" />
    </span>
  );
}

function getFormulaPlaceholder(category: EditableItemizedCategory) {
  return category.inputMode === "single"
    ? "if(count >= 10, count * 25, count * 20)"
    : "if(penalty > 0, count * points_each - penalty, count * points_each)";
}

function getFormulaExamples(category: EditableItemizedCategory) {
  return category.inputMode === "single"
    ? ["count * 20", "if(count >= 10, count * 25, count * 20)", "count % 2"]
    : [
        "count * points_each - penalty",
        "if(count >= 10, count * points_each, count * points_each - penalty)",
        "if(penalty > 0, count * points_each - penalty, count * points_each)",
      ];
}

export function SectionBadge({
  text,
  color,
}: {
  text: string;
  color?: string | null;
}) {
  return (
    <Badge
      className="border bg-background/80 text-xs font-semibold"
      style={getTitleAccentStyle(color)}
      variant="outline"
    >
      {text}
    </Badge>
  );
}

function SettingsSection({
  title,
  summary,
  badge,
  color,
  testId,
  density = "default",
  resolved,
  open,
  disabled,
  onToggle,
  children,
}: {
  title: string;
  summary: string;
  badge: ReactNode;
  color?: string | null;
  testId?: string;
  density?: "default" | "compact";
  resolved: boolean;
  open: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const resolvedStyle =
    resolved && color
      ? {
          borderColor: `color-mix(in srgb, ${color} 42%, var(--border))`,
          backgroundColor: open
            ? `color-mix(in srgb, ${color} 14%, var(--card))`
            : `color-mix(in srgb, ${color} 18%, var(--card))`,
          boxShadow: `0 16px 34px -30px ${color}`,
        }
      : undefined;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-muted/50 transition",
        resolved && "shadow-sm",
        disabled && "opacity-80",
      )}
      data-testid={testId}
      style={resolvedStyle}
    >
      <button
        aria-expanded={open}
        className={cn(
          "flex w-full items-center justify-between gap-3 text-left",
          density === "compact" ? "px-4 py-2.5" : "px-4 py-3",
        )}
        onClick={onToggle}
        type="button"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-semibold text-foreground",
                resolved && color && "text-[color:var(--game-section-accent)]",
              )}
              style={
                resolved && color
                  ? ({
                      ["--game-section-accent" as string]: color,
                    } as CSSProperties)
                  : undefined
              }
            >
              {title}
            </p>
          </div>
          <p
            className={cn(
              "text-muted-foreground",
              density === "compact" ? "text-xs" : "text-sm",
            )}
          >
            {summary}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge}
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-out",
              open && "rotate-180",
            )}
          />
        </div>
      </button>
      <div
        aria-hidden={!open}
        className={cn(
          "grid transition-all duration-300 ease-out",
          open
            ? "visible grid-rows-[1fr] opacity-100"
            : "invisible grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "border-t border-border px-4",
              density === "compact" ? "py-3" : "py-4",
            )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  active,
  isDefault,
  defaultColor,
  selectedColor,
  density = "default",
  onClick,
  title,
  description,
  disabled,
}: {
  active: boolean;
  defaultColor?: string | null;
  selectedColor?: string | null;
  density?: "default" | "compact";
  isDefault?: boolean;
  onClick: () => void;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <button
      className={cn(
        "rounded-xl border text-left transition",
        density === "compact" ? "p-3" : "p-4",
        active
          ? "border-foreground bg-foreground text-background shadow-sm"
          : "border-border bg-card text-foreground hover:bg-muted",
        isDefault && !active && "relative",
        disabled && "cursor-not-allowed opacity-70",
      )}
      disabled={disabled}
      onClick={onClick}
      style={getDefaultOptionStyle({
        activeColor: getSelectionAccentColor({
          active,
          isDefault: Boolean(isDefault),
          selectedColor,
          defaultColor,
        }),
        defaultColor,
        active,
        isDefault: Boolean(isDefault),
      })}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            density === "compact" ? "text-sm font-black" : "font-black",
          )}
        >
          {title}
        </p>
        {isDefault ? (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]",
              active
                ? "border-white/35 bg-white/12 text-white"
                : "border-current/15 bg-background/70 text-foreground/70",
            )}
          >
            Default
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-1 opacity-80",
          density === "compact" ? "text-xs leading-5" : "text-sm",
        )}
      >
        {description}
      </p>
    </button>
  );
}

function DefaultNumberField({
  color,
  description,
  badgeText,
  chrome = true,
  density = "default",
  gameDefaultColor,
  gameDefaultValue,
  min,
  onGameDefaultSelect,
  onSubmit,
  onValueChange,
  defaultValue,
  placeholder,
  disabled,
  submitAriaLabel,
}: {
  color?: string | null;
  description: string;
  badgeText?: "Default" | "Selected" | null;
  chrome?: boolean;
  density?: "default" | "compact";
  gameDefaultColor?: string | null;
  gameDefaultValue?: number | null;
  min?: number;
  onGameDefaultSelect?: (value: string) => void;
  onSubmit: () => void;
  onValueChange: (nextValue: string) => void;
  placeholder: string;
  defaultValue: string;
  disabled?: boolean;
  submitAriaLabel?: string;
}) {
  return (
    <div
      className={cn("space-y-3 rounded-xl", chrome && color && "border p-3")}
      style={
        chrome && color
          ? {
              borderColor: `color-mix(in srgb, ${color} 36%, var(--border))`,
              backgroundColor: `color-mix(in srgb, ${color} 8%, var(--card))`,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{description}</p>
        {chrome && badgeText ? (
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={getTitleAccentStyle(color)}
          >
            {badgeText}
          </span>
        ) : null}
      </div>
      {gameDefaultValue !== null && gameDefaultValue !== undefined ? (
        <button
          aria-label={`Use game default ${gameDefaultValue}`}
          className="flex w-full items-center justify-between rounded-lg border border-dashed px-3 py-2 text-left text-sm font-semibold transition hover:bg-muted"
          disabled={disabled}
          onClick={() =>
            (onGameDefaultSelect ?? onValueChange)(
              gameDefaultValue.toString(),
            )
          }
          style={getTitleAccentStyle(gameDefaultColor)}
          type="button"
        >
          <span>Game default</span>
          <span className="text-base font-black">{gameDefaultValue}</span>
        </button>
      ) : null}
      <div className="flex gap-2">
        <Input
          className={cn(
            "bg-background px-4",
            density === "compact"
              ? "h-11 rounded-xl text-base"
              : "h-14 rounded-xl text-lg",
          )}
          disabled={disabled}
          inputMode="numeric"
          min={min}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          type="number"
          value={defaultValue}
        />
        <Button
          aria-label={submitAriaLabel ?? `Confirm ${placeholder.toLowerCase()}`}
          disabled={disabled}
          onClick={onSubmit}
          type="button"
        >
          <Check className="size-5" />
        </Button>
      </div>
    </div>
  );
}

function ItemizedCategoriesEditor({
  categories,
  density = "default",
  disabled,
  onChange,
}: {
  categories: EditableItemizedCategory[];
  density?: "default" | "compact";
  disabled?: boolean;
  onChange: (nextCategories: EditableItemizedCategory[]) => void;
}) {
  function updateCategory(
    categoryId: string,
    update: (category: EditableItemizedCategory) => EditableItemizedCategory,
  ) {
    onChange(
      categories.map((category) =>
        category.id === categoryId ? update(category) : category,
      ),
    );
  }

  function removeCategory(categoryId: string) {
    onChange(categories.filter((category) => category.id !== categoryId));
  }

  function addCategory(mode: "single" | "multi") {
    onChange([...categories, createEditableCategory(mode)]);
  }

  return (
    <div className={cn(density === "compact" ? "space-y-3" : "space-y-4")}>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={disabled}
          onClick={() => addCategory("single")}
          type="button"
          variant="outline"
        >
          Add simple category
        </Button>
        <Button
          disabled={disabled}
          onClick={() => addCategory("multi")}
          type="button"
          variant="outline"
        >
          Add advanced category
        </Button>
      </div>
      <div className={cn(density === "compact" ? "space-y-3" : "space-y-4")}>
        {categories.map((category, categoryIndex) => (
          <div
            className={cn(
              "rounded-xl border border-border bg-background",
              density === "compact" ? "p-3" : "p-4",
            )}
            key={category.id}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-muted-foreground">
                Category {categoryIndex + 1}
              </p>
              <Button
                disabled={disabled}
                onClick={() => removeCategory(category.id)}
                type="button"
                variant="ghost"
              >
                Remove
              </Button>
            </div>
            <div
              className={cn(
                "mt-3 grid",
                density === "compact" ? "gap-2.5" : "gap-3",
              )}
            >
              <label className="space-y-2">
                <span className="text-sm font-medium">Label</span>
                <Input
                  className={cn(
                    density === "compact"
                      ? "h-10 rounded-xl"
                      : "h-12 rounded-xl",
                  )}
                  disabled={disabled}
                  onChange={(event) =>
                    updateCategory(category.id, (current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Coins, tricks, stars..."
                  value={category.name}
                />
                <p className="text-sm text-muted-foreground">
                  This is the player-facing name.
                </p>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Category key</span>
                <Input
                  className={cn(
                    "font-mono",
                    density === "compact"
                      ? "h-10 rounded-xl"
                      : "h-12 rounded-xl",
                  )}
                  disabled={disabled}
                  onChange={(event) =>
                    updateCategory(category.id, (current) => ({
                      ...current,
                      categoryKey: event.target.value,
                    }))
                  }
                  placeholder="yellow_expedition"
                  value={category.categoryKey}
                />
                <p className="text-sm text-muted-foreground">
                  Use a readable key so custom UIs can match this category. The
                  saved game will keep this key and add its own unique prefix
                  behind the scenes.
                </p>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium">Help text</span>
                <Input
                  className={cn(
                    density === "compact"
                      ? "h-10 rounded-xl"
                      : "h-12 rounded-xl",
                  )}
                  disabled={disabled}
                  onChange={(event) =>
                    updateCategory(category.id, (current) => ({
                      ...current,
                      helpText: event.target.value,
                    }))
                  }
                  placeholder="Optional instructions for score entry"
                  value={category.helpText}
                />
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
                <Checkbox
                  checked={category.optional}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    updateCategory(category.id, (current) => ({
                      ...current,
                      optional: Boolean(checked),
                    }))
                  }
                />
                <div className="space-y-1">
                  <span className="text-sm font-medium text-foreground">
                    Optional item
                  </span>
                  <p className="text-sm text-muted-foreground">
                    Use this when some players will leave the item blank and it
                    should simply count as zero or the configured default.
                  </p>
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className={cn(
                    "rounded-xl border text-left transition",
                    density === "compact" ? "p-3" : "p-4",
                    category.inputMode === "single"
                      ? "border-foreground bg-foreground text-background shadow-sm"
                      : "border-border bg-card text-foreground hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-70",
                  )}
                  disabled={disabled}
                  onClick={() =>
                    updateCategory(category.id, (current) => ({
                      ...current,
                      inputMode: "single",
                      inputs: [
                        current.inputs[0] ?? {
                          key: "count",
                          label: "Count",
                          defaultValue: "0",
                        },
                      ],
                    }))
                  }
                  type="button"
                >
                  <p
                    className={cn(
                      density === "compact"
                        ? "text-sm font-black"
                        : "font-black",
                    )}
                  >
                    Simple
                  </p>
                  <p
                    className={cn(
                      "mt-1 opacity-80",
                      density === "compact" ? "text-xs" : "text-sm",
                    )}
                  >
                    One numeric input
                  </p>
                </button>
                <button
                  className={cn(
                    "rounded-xl border text-left transition",
                    density === "compact" ? "p-3" : "p-4",
                    category.inputMode === "multi"
                      ? "border-foreground bg-foreground text-background shadow-sm"
                      : "border-border bg-card text-foreground hover:bg-muted",
                    disabled && "cursor-not-allowed opacity-70",
                  )}
                  disabled={disabled}
                  onClick={() =>
                    updateCategory(category.id, (current) => ({
                      ...current,
                      inputMode: "multi",
                      inputs:
                        current.inputs.length >= 2
                          ? current.inputs
                          : [
                              ...current.inputs,
                              {
                                key: `value_${current.inputs.length + 1}`,
                                label: `Value ${current.inputs.length + 1}`,
                                defaultValue: "0",
                              },
                            ],
                    }))
                  }
                  type="button"
                >
                  <p
                    className={cn(
                      density === "compact"
                        ? "text-sm font-black"
                        : "font-black",
                    )}
                  >
                    Advanced
                  </p>
                  <p
                    className={cn(
                      "mt-1 opacity-80",
                      density === "compact" ? "text-xs" : "text-sm",
                    )}
                  >
                    Multiple named inputs
                  </p>
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Inputs</p>
                  {category.inputMode === "multi" ? (
                    <Button
                      disabled={disabled}
                      onClick={() =>
                        updateCategory(category.id, (current) => ({
                          ...current,
                          inputs: [
                            ...current.inputs,
                            {
                              key: `value_${current.inputs.length + 1}`,
                              label: `Value ${current.inputs.length + 1}`,
                              defaultValue: "0",
                            },
                          ],
                        }))
                      }
                      type="button"
                      variant="ghost"
                    >
                      Add input
                    </Button>
                  ) : null}
                </div>
                {category.inputs.map((input, inputIndex) => (
                  <div
                    className="grid gap-3 md:grid-cols-3"
                    key={`${category.id}-${inputIndex}`}
                  >
                    <Input
                      className={cn(
                        density === "compact"
                          ? "h-10 rounded-xl"
                          : "h-12 rounded-xl",
                      )}
                      disabled={disabled}
                      onChange={(event) =>
                        updateCategory(category.id, (current) => ({
                          ...current,
                          inputs: current.inputs.map((entry, entryIndex) =>
                            entryIndex === inputIndex
                              ? {
                                  ...entry,
                                  label: event.target.value,
                                }
                              : entry,
                          ),
                        }))
                      }
                      placeholder="Input label"
                      value={input.label}
                    />
                    <Input
                      className={cn(
                        density === "compact"
                          ? "h-10 rounded-xl"
                          : "h-12 rounded-xl",
                      )}
                      disabled={disabled}
                      onChange={(event) =>
                        updateCategory(category.id, (current) => ({
                          ...current,
                          inputs: current.inputs.map((entry, entryIndex) =>
                            entryIndex === inputIndex
                              ? { ...entry, key: event.target.value }
                              : entry,
                          ),
                        }))
                      }
                      placeholder="formula_key"
                      value={input.key}
                    />
                    <div className="flex gap-2">
                      <Input
                        className={cn(
                          density === "compact"
                            ? "h-10 rounded-xl"
                            : "h-12 rounded-xl",
                        )}
                        disabled={disabled}
                        inputMode="numeric"
                        onChange={(event) =>
                          updateCategory(category.id, (current) => ({
                            ...current,
                            inputs: current.inputs.map((entry, entryIndex) =>
                              entryIndex === inputIndex
                                ? {
                                    ...entry,
                                    defaultValue: event.target.value,
                                  }
                                : entry,
                            ),
                          }))
                        }
                        placeholder="Preview value"
                        type="number"
                        value={input.defaultValue}
                      />
                      {category.inputMode === "multi" ? (
                        <Button
                          disabled={disabled || category.inputs.length <= 2}
                          onClick={() =>
                            updateCategory(category.id, (current) => ({
                              ...current,
                              inputs: current.inputs.filter(
                                (_, entryIndex) => entryIndex !== inputIndex,
                              ),
                            }))
                          }
                          type="button"
                          variant="ghost"
                        >
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <label className="space-y-2">
                <span className="text-sm font-medium">Formula</span>
                <Textarea
                  className={cn(
                    "border-border/80 bg-slate-800 px-4 py-3 font-mono text-sm text-slate-50 placeholder:text-slate-400 dark:bg-slate-950",
                    density === "compact"
                      ? "min-h-28 rounded-xl leading-5"
                      : "min-h-32 rounded-xl leading-6",
                  )}
                  disabled={disabled}
                  onChange={(event) =>
                    updateCategory(category.id, (current) => ({
                      ...current,
                      formula: event.target.value,
                    }))
                  }
                  placeholder={getFormulaPlaceholder(category)}
                  spellCheck={false}
                  value={category.formula}
                />
              </label>
              <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                <p className="font-mono text-xs text-muted-foreground">
                  Supports `+ - * / %`, comparisons (`&lt;`, `&lt;=`, `&gt;`,
                  `&gt;=`, `==`, `!=`), and helpers `abs`, `ceil`, `floor`,
                  `if`, `max`, `min`, `round`.
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  Examples: {getFormulaExamples(category).join("  •  ")}
                </p>
              </div>
              <p
                className="text-sm text-muted-foreground"
                data-testid={`itemized-preview-${category.id}`}
              >
                {category.optional ? "Optional. " : ""}
                {getCategoryPreview(category)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameSettingsV2Editor({
  currentSettings,
  defaultColor,
  defaultIndicatorSeed,
  density = "default",
  draft,
  disabled,
  disabledReason,
  itemizedMode = "info",
  onDraftChange,
  onSectionOpenChange,
  onSectionTouchedChange,
  sectionOpen,
  sectionTouched,
  selectedColor,
  titleSeed,
}: {
  currentSettings: GameSettingsV2;
  defaultColor?: string | null;
  defaultIndicatorSeed?: CreateGameSettingsTitleSeed;
  density?: "default" | "compact";
  draft: EditableGameSettingsV2;
  disabled?: boolean;
  disabledReason?: string | null;
  itemizedMode?: "info" | "editor";
  onDraftChange: (nextDraft: EditableGameSettingsV2) => void;
  onSectionOpenChange: (nextState: SectionOpenState) => void;
  onSectionTouchedChange: (nextState: SectionTouchedState) => void;
  sectionOpen: SectionOpenState;
  sectionTouched: SectionTouchedState;
  selectedColor?: string | null;
  titleSeed: CreateGameSettingsTitleSeed;
}) {
  const defaultSeed = defaultIndicatorSeed ?? titleSeed;
  function completeSection(
    section: CreateGameSettingsSection,
    nextDraft = draft,
    touchedOverrides?: Partial<SectionTouchedState>,
  ) {
    onDraftChange(nextDraft);
    onSectionTouchedChange({
      ...sectionTouched,
      [section]: true,
      ...touchedOverrides,
    });
    onSectionOpenChange({
      ...sectionOpen,
      [section]: false,
    });
  }

  function hasResolvedEndCondition(nextDraft: EditableGameSettingsV2) {
    if (!nextDraft.template || !nextDraft.gameplayMode) {
      return false;
    }

    if (nextDraft.gameplayMode === "no_rounds") {
      return true;
    }

    if (!nextDraft.endConditionMode) {
      return false;
    }

    if (nextDraft.endConditionMode === "manual") {
      return true;
    }

    if (nextDraft.endConditionMode === "fixed_rounds") {
      return parsePositiveInteger(nextDraft.targetRounds) !== null;
    }

    return parsePositiveInteger(nextDraft.thresholdValue) !== null;
  }

  function handleTemplateChange(template: EditableGameSettingsV2["template"]) {
    if (!template) {
      return;
    }

    const nextDraft = {
      ...draft,
      template,
      winMetric:
        template === "choose_winner" || template === "elimination"
          ? "highest_score"
          : draft.template === template
            ? draft.winMetric
            : null,
      endConditionMode:
        draft.gameplayMode === "no_rounds" ? null : draft.endConditionMode,
      allowTies: true,
      itemizedCategories:
        template === "point_scoring" && draft.itemizedCategories.length === 0
          ? [createEditableCategory("single")]
          : draft.itemizedCategories,
    };
    onDraftChange(nextDraft);

    const nextTouched = {
      ...sectionTouched,
      gameType: true,
      initialScore:
        template !== "point_scoring" ? true : sectionTouched.initialScore,
      endCondition: false,
    };
    onSectionTouchedChange(nextTouched);
    onSectionOpenChange({
      ...sectionOpen,
      gameType: false,
      gameplay: draft.gameplayMode ? sectionOpen.gameplay : true,
      endCondition: nextTouched.endCondition ? false : sectionOpen.endCondition,
      initialScore: usesNumericScoring(template)
        ? sectionOpen.initialScore
        : false,
    });
  }

  function handleGameplayChange(
    gameplayMode: EditableGameSettingsV2["gameplayMode"],
  ) {
    if (!gameplayMode) {
      return;
    }

    const isSinglePlay = gameplayMode === "no_rounds";
    const nextDraft: EditableGameSettingsV2 = {
      ...draft,
      gameplayMode,
      endConditionMode: isSinglePlay ? null : draft.endConditionMode,
    };

    onDraftChange(nextDraft);
    onSectionTouchedChange({
      ...sectionTouched,
      gameplay: true,
      endCondition: isSinglePlay,
    });
    onSectionOpenChange({
      ...sectionOpen,
      gameplay: false,
      endCondition: !isSinglePlay,
    });
  }

  function updateNumericSection(
    key: "targetRounds" | "thresholdValue",
    value: string,
  ) {
    const nextDraft = {
      ...draft,
      [key]: value,
    };
    onDraftChange(nextDraft);

    if (parsePositiveInteger(value) !== null) {
      completeSection("endCondition", nextDraft);
    }
  }

  const initialScoreResolved = isInitialScoreResolved({
    seed: titleSeed,
    currentSettings,
    settingsDraft: draft,
    touched: sectionTouched,
  });
  const initialScoreUsesDefault = isInitialScoreUsingTitleDefault({
    seed: defaultSeed,
    currentSettings,
  });
  const roundsValueUsesDefault =
    defaultSeed.source === "v2" &&
    currentSettings.roundConfig.targetRounds !== null &&
    currentSettings.roundConfig.targetRounds ===
      defaultSeed.settings.roundConfig.targetRounds;
  const thresholdValueUsesDefault =
    defaultSeed.source === "v2" &&
    currentSettings.thresholdConfig.value !== null &&
    currentSettings.thresholdConfig.value ===
      defaultSeed.settings.thresholdConfig.value;

  const sectionBadge = (section: CreateGameSettingsSection) => {
    const label = getSectionStatusLabel({
      section,
      seed: titleSeed,
      currentSettings,
      settingsDraft: draft,
      touched: sectionTouched,
    });

    if (!label) {
      return null;
    }

    const usesDefault = isSectionUsingTitleDefault({
      section,
      seed: defaultSeed,
      currentSettings,
    });

    return (
      <CompletedSectionBadge
        color={usesDefault ? defaultColor : selectedColor}
      />
    );
  };

  return (
    <div className={cn(density === "compact" ? "space-y-3" : "space-y-4")}>
      <SettingsSection
        badge={sectionBadge("gameType")}
        color={getSectionAccentColor({
          section: "gameType",
          seed: titleSeed,
          defaultSeed,
          currentSettings,
          settingsDraft: draft,
          touched: sectionTouched,
          defaultColor,
          selectedColor,
        })}
        disabled={disabled}
        density={density}
        onToggle={() =>
          onSectionOpenChange({
            ...sectionOpen,
            gameType: !sectionOpen.gameType,
          })
        }
        open={sectionOpen.gameType}
        resolved={isSectionResolved({
          section: "gameType",
          seed: titleSeed,
          currentSettings,
          settingsDraft: draft,
          touched: sectionTouched,
        })}
        summary={getTemplateLabel(draft.template)}
        title="Game Scoring"
      >
        {disabledReason ? (
          <p className="mb-3 text-sm text-muted-foreground">{disabledReason}</p>
        ) : null}
        <div
          className={cn(
            "grid gap-3",
            density === "compact" && "xl:grid-cols-2",
          )}
        >
          {GAME_SCORING_OPTIONS.map((option) => (
            <OptionCard
              key={option.value}
              active={draft.template === option.value}
              defaultColor={defaultColor}
              description={option.description}
              density={density}
              disabled={disabled}
              isDefault={isDefaultTemplateOption(defaultSeed, option.value)}
              onClick={() => handleTemplateChange(option.value)}
              selectedColor={selectedColor}
              title={option.title}
            />
          ))}
        </div>
        {draft.template === "point_scoring" && itemizedMode === "editor" ? (
          <div className="mt-4">
            <ItemizedCategoriesEditor
              categories={draft.itemizedCategories}
              density={density}
              disabled={disabled}
              onChange={(nextCategories) =>
                onDraftChange({
                  ...draft,
                  itemizedCategories: nextCategories,
                })
              }
            />
          </div>
        ) : null}
      </SettingsSection>

      <SettingsSection
        badge={sectionBadge("gameplay")}
        color={getSectionAccentColor({
          section: "gameplay",
          seed: titleSeed,
          defaultSeed,
          currentSettings,
          settingsDraft: draft,
          touched: sectionTouched,
          defaultColor,
          selectedColor,
        })}
        disabled={disabled}
        density={density}
        onToggle={() =>
          onSectionOpenChange({
            ...sectionOpen,
            gameplay: !sectionOpen.gameplay,
          })
        }
        open={sectionOpen.gameplay}
        resolved={isSectionResolved({
          section: "gameplay",
          seed: titleSeed,
          currentSettings,
          settingsDraft: draft,
          touched: sectionTouched,
        })}
        summary={getGameplaySummary(draft)}
        title="Gameplay"
      >
        {!draft.template ? (
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            Choose a game scoring style first.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <OptionCard
              active={draft.gameplayMode === "rounds"}
              defaultColor={defaultColor}
              description="Play multiple rounds and keep an overall result."
              density={density}
              disabled={disabled}
              isDefault={
                defaultSeed.source === "v2" &&
                defaultSeed.settings.roundConfig.enabled
              }
              onClick={() => handleGameplayChange("rounds")}
              selectedColor={selectedColor}
              title="Multiple Rounds"
            />
            <OptionCard
              active={draft.gameplayMode === "no_rounds"}
              defaultColor={defaultColor}
              description="Score one time at the end to determine the winner."
              density={density}
              disabled={disabled}
              isDefault={
                defaultSeed.source === "v2" &&
                !defaultSeed.settings.roundConfig.enabled
              }
              onClick={() => handleGameplayChange("no_rounds")}
              selectedColor={selectedColor}
              title="No rounds"
            />
          </div>
        )}
      </SettingsSection>

      <SettingsSection
        badge={sectionBadge("winCondition")}
        color={getSectionAccentColor({
          section: "winCondition",
          seed: titleSeed,
          defaultSeed,
          currentSettings,
          settingsDraft: draft,
          touched: sectionTouched,
          defaultColor,
          selectedColor,
        })}
        disabled={disabled}
        density={density}
        onToggle={() =>
          onSectionOpenChange({
            ...sectionOpen,
            winCondition: !sectionOpen.winCondition,
          })
        }
        open={sectionOpen.winCondition}
        resolved={isSectionResolved({
          section: "winCondition",
          seed: titleSeed,
          currentSettings,
          settingsDraft: draft,
          touched: sectionTouched,
        })}
        summary={getWinConditionSummary(draft)}
        title="Winner"
      >
        {disabledReason ? (
          <p className="mb-3 text-sm text-muted-foreground">{disabledReason}</p>
        ) : null}
        {!draft.template ? (
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            Choose a game scoring style first.
          </div>
        ) : draft.template === "elimination" ? (
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {draft.gameplayMode === "rounds"
              ? "The last remaining player wins each round. Each round win is worth one point, and the most wins takes the game."
              : "The last remaining player wins the game."}
          </div>
        ) : draft.template === "choose_winner" ? (
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            {draft.gameplayMode === "rounds"
              ? "Choose one winner each round. Each win is worth one point, and the most wins takes the game."
              : "Choose one player to win this play-through."}
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-3",
              density === "compact" && "md:grid-cols-2",
            )}
          >
            <OptionCard
              active={draft.winMetric === "highest_score"}
              defaultColor={defaultColor}
              description="The player with the most points wins."
              density={density}
              disabled={disabled}
              isDefault={isDefaultWinMetricOption(defaultSeed, "highest_score")}
              onClick={() => {
                const nextDraft = {
                  ...draft,
                  winMetric: "highest_score" as const,
                };
                completeSection("winCondition", nextDraft, {
                  endCondition:
                    sectionTouched.endCondition ||
                    hasResolvedEndCondition(nextDraft),
                });
              }}
              selectedColor={selectedColor}
              title="Highest score"
            />
            <OptionCard
              active={draft.winMetric === "lowest_score"}
              defaultColor={defaultColor}
              description="The player with the fewest points wins."
              density={density}
              disabled={disabled}
              isDefault={isDefaultWinMetricOption(defaultSeed, "lowest_score")}
              onClick={() => {
                const nextDraft = {
                  ...draft,
                  winMetric: "lowest_score" as const,
                };
                completeSection("winCondition", nextDraft, {
                  endCondition:
                    sectionTouched.endCondition ||
                    hasResolvedEndCondition(nextDraft),
                });
              }}
              selectedColor={selectedColor}
              title="Lowest score"
            />
          </div>
        )}
      </SettingsSection>

      {draft.gameplayMode === "rounds" ? (
        <SettingsSection
          badge={sectionBadge("endCondition")}
          color={getSectionAccentColor({
            section: "endCondition",
            seed: titleSeed,
            defaultSeed,
            currentSettings,
            settingsDraft: draft,
            touched: sectionTouched,
            defaultColor,
            selectedColor,
          })}
          disabled={disabled}
          density={density}
          onToggle={() =>
            onSectionOpenChange({
              ...sectionOpen,
              endCondition: !sectionOpen.endCondition,
            })
          }
          open={sectionOpen.endCondition}
          resolved={isSectionResolved({
            section: "endCondition",
            seed: titleSeed,
            currentSettings,
            settingsDraft: draft,
            touched: sectionTouched,
          })}
          summary={getEndConditionSummary(draft)}
          title="End condition"
        >
          {disabledReason ? (
            <p className="mb-3 text-sm text-muted-foreground">
              {disabledReason}
            </p>
          ) : null}
          {!draft.template || !draft.gameplayMode ? (
            <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
              Choose Game Scoring and Gameplay first.
            </div>
          ) : (
            <div className="space-y-3">
              <div
                className={cn(
                  "grid gap-3",
                  draft.gameplayMode === "rounds"
                    ? "md:grid-cols-3"
                    : "md:grid-cols-2",
                )}
              >
                <OptionCard
                  active={draft.endConditionMode === "manual"}
                  defaultColor={defaultColor}
                  description="Keep playing as long as you want"
                  density={density}
                  disabled={disabled}
                  isDefault={
                    defaultSeed.source === "v2" &&
                    defaultSeed.settings.gameEndTrigger === "manual_finish"
                  }
                  onClick={() =>
                    completeSection("endCondition", {
                      ...draft,
                      endConditionMode: "manual",
                    })
                  }
                  selectedColor={selectedColor}
                  title={
                    draft.gameplayMode === "rounds" ? "Free play" : "Free Play"
                  }
                />
                {draft.gameplayMode === "rounds" ? (
                  <OptionCard
                    active={draft.endConditionMode === "fixed_rounds"}
                    defaultColor={defaultColor}
                    description="End the game after a specific number of rounds."
                    density={density}
                    disabled={disabled}
                    isDefault={isDefaultRoundsValue(defaultSeed)}
                    onClick={() => {
                      const nextDraft = {
                        ...draft,
                        endConditionMode: "fixed_rounds" as const,
                      };
                      onSectionTouchedChange({
                        ...sectionTouched,
                        endCondition: false,
                      });
                      onDraftChange(nextDraft);
                    }}
                    selectedColor={selectedColor}
                    title="Fixed number of rounds"
                  />
                ) : null}
                <OptionCard
                  active={draft.endConditionMode === "score_threshold"}
                  defaultColor={defaultColor}
                  description={
                    draft.template === "point_scoring"
                      ? "End when someone reaches a specific score."
                      : "End when someone reaches a specific number of wins."
                  }
                  density={density}
                  disabled={disabled}
                  isDefault={isDefaultThresholdValue(defaultSeed)}
                  onClick={() => {
                    const nextDraft = {
                      ...draft,
                      endConditionMode: "score_threshold" as const,
                    };
                    onSectionTouchedChange({
                      ...sectionTouched,
                      endCondition: false,
                    });
                    onDraftChange(nextDraft);
                  }}
                  selectedColor={selectedColor}
                  title={
                    draft.template === "point_scoring"
                      ? "Score threshold"
                      : "Win target"
                  }
                />
              </div>

              {draft.endConditionMode === "fixed_rounds" ? (
                <DefaultNumberField
                  badgeText={
                    roundsValueUsesDefault
                      ? "Default"
                      : parsePositiveInteger(draft.targetRounds) !== null
                        ? "Selected"
                        : null
                  }
                  color={
                    roundsValueUsesDefault
                      ? defaultColor
                      : parsePositiveInteger(draft.targetRounds) !== null
                        ? selectedColor
                        : undefined
                  }
                  defaultValue={draft.targetRounds}
                  description="Choose how many rounds should be completed before the game ends."
                  density={density}
                  disabled={disabled}
                  gameDefaultColor={defaultColor}
                  gameDefaultValue={
                    defaultSeed.source === "v2"
                      ? defaultSeed.settings.roundConfig.targetRounds
                      : null
                  }
                  onGameDefaultSelect={(value) => {
                    onDraftChange({ ...draft, targetRounds: value });
                    onSectionTouchedChange({
                      ...sectionTouched,
                      endCondition: true,
                    });
                    onSectionOpenChange({
                      ...sectionOpen,
                      endCondition: false,
                    });
                  }}
                  onSubmit={() =>
                    updateNumericSection("targetRounds", draft.targetRounds)
                  }
                  onValueChange={(nextValue) => {
                    onSectionTouchedChange({
                      ...sectionTouched,
                      endCondition: false,
                    });
                    onDraftChange({
                      ...draft,
                      targetRounds: nextValue,
                    });
                  }}
                  placeholder="Target rounds"
                />
              ) : null}

              {draft.endConditionMode === "score_threshold" ? (
                <DefaultNumberField
                  badgeText={
                    thresholdValueUsesDefault
                      ? "Default"
                      : parsePositiveInteger(draft.thresholdValue) !== null
                        ? "Selected"
                        : null
                  }
                  color={
                    thresholdValueUsesDefault
                      ? defaultColor
                      : parsePositiveInteger(draft.thresholdValue) !== null
                        ? selectedColor
                        : undefined
                  }
                  defaultValue={draft.thresholdValue}
                  description={
                    draft.template === "point_scoring" &&
                    draft.winMetric === "lowest_score"
                      ? "The game ends when a player drops to this score or lower."
                      : draft.template === "point_scoring"
                        ? "The game ends when a player reaches this score or higher."
                        : "The game ends when a player reaches this many wins."
                  }
                  density={density}
                  disabled={disabled}
                  gameDefaultColor={defaultColor}
                  gameDefaultValue={
                    defaultSeed.source === "v2"
                      ? defaultSeed.settings.thresholdConfig.value
                      : null
                  }
                  onGameDefaultSelect={(value) => {
                    onDraftChange({ ...draft, thresholdValue: value });
                    onSectionTouchedChange({
                      ...sectionTouched,
                      endCondition: true,
                    });
                    onSectionOpenChange({
                      ...sectionOpen,
                      endCondition: false,
                    });
                  }}
                  onSubmit={() =>
                    updateNumericSection("thresholdValue", draft.thresholdValue)
                  }
                  onValueChange={(nextValue) => {
                    onSectionTouchedChange({
                      ...sectionTouched,
                      endCondition: false,
                    });
                    onDraftChange({
                      ...draft,
                      thresholdValue: nextValue,
                    });
                  }}
                  placeholder="Score target"
                />
              ) : null}
            </div>
          )}
        </SettingsSection>
      ) : null}

      {usesNumericScoring(draft.template) ? (
        <SettingsSection
          badge={
            initialScoreResolved ? (
              <CompletedSectionBadge
                color={initialScoreUsesDefault ? defaultColor : selectedColor}
              />
            ) : null
          }
          color={initialScoreUsesDefault ? defaultColor : selectedColor}
          testId="initial-score-setting"
          disabled={disabled}
          density={density}
          onToggle={() =>
            onSectionOpenChange({
              ...sectionOpen,
              initialScore: !sectionOpen.initialScore,
            })
          }
          open={sectionOpen.initialScore}
          resolved={initialScoreResolved}
          summary={getInitialScoreSummary(draft)}
          title="Initial score"
        >
          {disabledReason ? (
            <p className="mb-3 text-sm text-muted-foreground">
              {disabledReason}
            </p>
          ) : null}
          <DefaultNumberField
            badgeText={
              initialScoreUsesDefault
                ? "Default"
                : initialScoreResolved
                  ? "Selected"
                  : null
            }
            chrome={false}
            color={
              initialScoreUsesDefault
                ? defaultColor
                : initialScoreResolved
                  ? selectedColor
                  : undefined
            }
            defaultValue={draft.initialPlayerScore}
            description=""
            density={density}
            disabled={disabled}
            gameDefaultColor={defaultColor}
            gameDefaultValue={
              defaultSeed.source === "v2"
                ? defaultSeed.settings.initialPlayerScore
                : null
            }
            onGameDefaultSelect={(value) => {
              onDraftChange({
                ...draft,
                initialPlayerScore: value,
              });
              onSectionTouchedChange({
                ...sectionTouched,
                initialScore: true,
              });
              onSectionOpenChange({
                ...sectionOpen,
                initialScore: false,
              });
            }}
            onSubmit={() => {
              onSectionTouchedChange({
                ...sectionTouched,
                initialScore: true,
              });
              onSectionOpenChange({
                ...sectionOpen,
                initialScore: false,
              });
            }}
            onValueChange={(nextValue) => {
              onSectionTouchedChange({
                ...sectionTouched,
                initialScore: false,
              });
              onDraftChange({
                ...draft,
                initialPlayerScore: nextValue,
              });
            }}
            placeholder="Starting score"
            submitAriaLabel="Confirm starting score"
          />
        </SettingsSection>
      ) : null}
    </div>
  );
}
