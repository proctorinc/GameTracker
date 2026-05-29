const PROFILE_COLOR_STOPS = [
  "#1f2937",
  "#2563eb",
  "#14b8a6",
  "#84cc16",
  "#facc15",
  "#f97316",
  "#f43f5e",
  "#8b5cf6",
] as const;

const PROFILE_COLOR_COUNT = 36;

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function interpolateColor(startHex: string, endHex: string, t: number) {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);

  return rgbToHex({
    r: start.r + (end.r - start.r) * t,
    g: start.g + (end.g - start.g) * t,
    b: start.b + (end.b - start.b) * t,
  });
}

function createGradientPalette(stops: readonly string[], count: number) {
  if (stops.length === 0) return [];
  if (stops.length === 1 || count <= 1) return [stops[0]];

  return Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const segmentProgress = progress * (stops.length - 1);
    const segmentIndex = Math.min(
      Math.floor(segmentProgress),
      stops.length - 2,
    );
    const localProgress = segmentProgress - segmentIndex;

    return interpolateColor(
      stops[segmentIndex],
      stops[segmentIndex + 1],
      localProgress,
    );
  });
}

export const PROFILE_COLORS = createGradientPalette(
  PROFILE_COLOR_STOPS,
  PROFILE_COLOR_COUNT,
);

export function pickRandomProfileColor(random = Math.random) {
  const index = Math.floor(random() * PROFILE_COLORS.length);

  return PROFILE_COLORS[index] ?? PROFILE_COLORS[0] ?? "#2563eb";
}
