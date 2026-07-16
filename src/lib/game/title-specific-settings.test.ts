import { describe, expect, it } from "vitest";
import {
  normalizeDefaultPlayerRole,
  parseGameSpecificSettings,
} from "./title-specific-settings";

const lostCities = { normalizedTitle: "lost cities" };

describe("title-specific settings", () => {
  it("defaults Lost Cities to five expeditions", () => {
    expect(parseGameSpecificSettings(null, lostCities)).toEqual({
      expeditionCount: 5,
    });
  });

  it("accepts a persisted six-expedition preference", () => {
    expect(
      parseGameSpecificSettings('{"expeditionCount":6}', lostCities),
    ).toEqual({ expeditionCount: 6 });
  });

  it("normalizes unknown player roles to no permissions", () => {
    expect(normalizeDefaultPlayerRole("self_scorer")).toBe("self_scorer");
    expect(normalizeDefaultPlayerRole("unknown")).toBe("player");
  });
});
