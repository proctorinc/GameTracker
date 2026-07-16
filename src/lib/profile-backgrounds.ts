export const PROFILE_BACKGROUND_URLS = [
  "/images/profiles/maze-puzzle.png",
  "/images/profiles/stripes-horizontal.png",
  "/images/profiles/pinstripes-vertical.png",
  "/images/profiles/stripes-diagonal.png",
  "/images/profiles/chevrons.png",
  "/images/profiles/zigzags.png",
  "/images/profiles/checkerboard.png",
  "/images/profiles/topo.png",
  "/images/profiles/concentric-rings.png",
  "/images/profiles/waves.png",
  "/images/profiles/crosshatch.png",
  "/images/profiles/maze-jagged.png",
] as const;

const LEGACY_PROFILE_BACKGROUND_URLS = [
  "/images/profiles/circuits.png",
  "/images/profiles/dragon.png",
  "/images/profiles/knots.png",
  "/images/profiles/maze-honeycomb.png",
  "/images/profiles/rings.png",
  "/images/profiles/rocks.png",
  "/images/profiles/sea.png",
] as const;

const VALID_PROFILE_BACKGROUND_URLS = [
  ...PROFILE_BACKGROUND_URLS,
  ...LEGACY_PROFILE_BACKGROUND_URLS,
] as const;

export const DEFAULT_PROFILE_BACKGROUND_URL = "/images/profiles/maze-puzzle.png";

export function isProfileBackgroundUrl(
  avatarUrl: string | null | undefined,
): avatarUrl is (typeof VALID_PROFILE_BACKGROUND_URLS)[number] {
  return VALID_PROFILE_BACKGROUND_URLS.includes(
    avatarUrl as (typeof VALID_PROFILE_BACKGROUND_URLS)[number],
  );
}

export function getProfileBackgroundUrl(
  avatarUrl: string | null | undefined,
): string | null {
  if (!avatarUrl) {
    return null;
  }

  return isProfileBackgroundUrl(avatarUrl)
    ? avatarUrl
    : DEFAULT_PROFILE_BACKGROUND_URL;
}
