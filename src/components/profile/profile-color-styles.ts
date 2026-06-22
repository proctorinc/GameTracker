import type { CSSProperties } from "react";

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

function mixColors(
  base: ReturnType<typeof hexToRgb>,
  target: ReturnType<typeof hexToRgb>,
  amount: number,
) {
  return rgbToHex({
    r: base.r + (target.r - base.r) * amount,
    g: base.g + (target.g - base.g) * amount,
    b: base.b + (target.b - base.b) * amount,
  });
}

function getRelativeLuminance({ r, g, b }: ReturnType<typeof hexToRgb>) {
  const channels = [r, g, b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  const [red, green, blue] = channels;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function getProfileColorContrastValues(color: string) {
  const rgb = hexToRgb(color);
  const luminance = getRelativeLuminance(rgb);
  const isDark = luminance < 0.43;
  const textTint = isDark
    ? mixColors({ r: 255, g: 255, b: 255 }, rgb, 0.18)
    : mixColors({ r: 15, g: 23, b: 42 }, rgb, 0.22);

  return {
    isDark,
    textTint,
  };
}

export function getProfileColorFillStyles(color: string): CSSProperties {
  const { textTint } = getProfileColorContrastValues(color);

  return {
    backgroundColor: color,
    color: textTint,
  };
}

export function getProfileColorSurfaceStyles(color: string): CSSProperties {
  const { isDark, textTint } = getProfileColorContrastValues(color);
  return {
    backgroundColor: color,
    color: textTint,
    boxShadow: isDark
      ? "0 10px 24px rgba(15,23,42,0.18)"
      : "0 10px 24px rgba(15,23,42,0.12)",
    ["--profile-surface-ring" as string]: isDark
      ? "rgba(255,255,255,0.24)"
      : "rgba(255,255,255,0.52)",
    ["--profile-surface-highlight" as string]: isDark
      ? "rgba(255,255,255,0.18)"
      : "rgba(255,255,255,0.3)",
    ["--profile-surface-shade" as string]: isDark
      ? "rgba(15,23,42,0.16)"
      : "rgba(15,23,42,0.08)",
    ["--profile-surface-panel" as string]: isDark
      ? "rgba(255,255,255,0.18)"
      : "rgba(255,255,255,0.42)",
    ["--profile-surface-panel-border" as string]: isDark
      ? "rgba(255,255,255,0.24)"
      : "rgba(255,255,255,0.52)",
    ["--profile-surface-muted-text" as string]: isDark
      ? "rgba(255,255,255,0.8)"
      : "rgba(15,23,42,0.68)",
    ["--profile-surface-text" as string]: textTint,
  };
}
