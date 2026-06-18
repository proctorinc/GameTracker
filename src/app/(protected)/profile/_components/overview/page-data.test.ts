import { describe, expect, it } from "vitest";
import { selectProfileOverviewTab } from "./page-data";

describe("selectProfileOverviewTab", () => {
  it("defaults invite deep links to the friends tab", () => {
    expect(selectProfileOverviewTab({ invites: "1" })).toBe("friends");
  });

  it("accepts explicit tab selections for friends and settings", () => {
    expect(selectProfileOverviewTab({ tab: "friends" })).toBe("friends");
    expect(selectProfileOverviewTab({ tab: "settings" })).toBe("settings");
  });

  it("falls back to stats for unknown or missing tabs", () => {
    expect(selectProfileOverviewTab({ tab: "stats" })).toBe("stats");
    expect(selectProfileOverviewTab({ tab: "something-else" })).toBe("stats");
    expect(selectProfileOverviewTab({})).toBe("stats");
  });
});
