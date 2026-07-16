export const DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS = 50;

export function normalizeTitleImageVerticalFocus(input: number | null | undefined) {
  if (typeof input !== "number" || !Number.isFinite(input)) {
    return DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS;
  }

  return Math.max(0, Math.min(100, Math.round(input)));
}

export function getTitleImageObjectPosition(verticalFocus: number | null | undefined) {
  return `50% ${normalizeTitleImageVerticalFocus(verticalFocus)}%`;
}
