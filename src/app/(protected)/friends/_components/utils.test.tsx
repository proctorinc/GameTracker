import { describe, expect, it } from "vitest";
import {
  formatActivityDay,
  formatActivityTime,
  formatLastPlayedAt,
} from "./utils";

describe("friends date formatting", () => {
  const baseOptions = {
    mounted: true,
    timeZone: "America/Los_Angeles",
  } as const;

  it("formats activity times in the browser timezone", () => {
    expect(
      formatActivityTime("2026-06-05T02:30:00.000Z", baseOptions),
    ).toBe("7:30 PM");
  });

  it("formats activity days using the browser timezone for relative labels", () => {
    expect(
      formatActivityDay("2026-06-05T02:30:00.000Z", {
        ...baseOptions,
        now: new Date("2026-06-05T03:00:00.000Z"),
      }),
    ).toBe("Today");
  });

  it("formats recently played dates in the browser timezone", () => {
    expect(
      formatLastPlayedAt("2026-06-05T02:30:00.000Z", baseOptions),
    ).toBe("Played Jun 4");
  });
});
