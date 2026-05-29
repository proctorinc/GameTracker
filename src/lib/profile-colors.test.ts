import { describe, expect, it } from "vitest";

import { PROFILE_COLORS, pickRandomProfileColor } from "./profile-colors";

describe("pickRandomProfileColor", () => {
  it("always returns a color from the shared profile palette", () => {
    for (const random of [0, 0.2, 0.5, 0.999999]) {
      expect(PROFILE_COLORS).toContain(pickRandomProfileColor(() => random));
    }
  });

  it("can select the first and last palette colors", () => {
    expect(pickRandomProfileColor(() => 0)).toBe(PROFILE_COLORS[0]);
    expect(pickRandomProfileColor(() => 0.999999)).toBe(
      PROFILE_COLORS[PROFILE_COLORS.length - 1],
    );
  });
});
