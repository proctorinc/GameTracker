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
export const PROFILE_COLOR_SATURATION = 68;
export const PROFILE_COLOR_LIGHTNESS = 52;

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

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, saturation)) / 100;
  const l = Math.max(0, Math.min(100, lightness)) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const huePrime = normalizedHue / 60;
  const x = chroma * (1 - Math.abs((huePrime % 2) - 1));

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = x;
  } else if (huePrime < 2) {
    red = x;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = x;
  } else if (huePrime < 4) {
    green = x;
    blue = chroma;
  } else if (huePrime < 5) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match = l - chroma / 2;

  return {
    r: Math.round((red + match) * 255),
    g: Math.round((green + match) * 255),
    b: Math.round((blue + match) * 255),
  };
}

export function createProfileHueColor(hue: number) {
  return rgbToHex(
    hslToRgb(hue, PROFILE_COLOR_SATURATION, PROFILE_COLOR_LIGHTNESS),
  );
}

export function pickRandomProfileColor(random = Math.random) {
  const index = Math.floor(random() * PROFILE_COLORS.length);

  return PROFILE_COLORS[index] ?? PROFILE_COLORS[0] ?? "#2563eb";
}
