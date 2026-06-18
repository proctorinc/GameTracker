import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useRememberedPageTabState } from "./use-remembered-page-tab-state";

const VALID_TABS = ["activity", "leaderboard"] as const;

function TestHarness(props: {
  initialValue: (typeof VALID_TABS)[number];
  preferInitialValue?: boolean;
}) {
  const [activeTab, setActiveTab] = useRememberedPageTabState({
    storageKey: "test.page-tab",
    initialValue: props.initialValue,
    validTabs: VALID_TABS,
    preferInitialValue: props.preferInitialValue,
  });

  return (
    <div>
      <span>{activeTab}</span>
      <button type="button" onClick={() => setActiveTab("leaderboard")}>
        Switch
      </button>
    </div>
  );
}

describe("useRememberedPageTabState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("restores the stored tab when there is no explicit override", async () => {
    window.localStorage.setItem("test.page-tab", "leaderboard");

    render(<TestHarness initialValue="activity" />);

    expect(await screen.findByText("leaderboard")).toBeInTheDocument();
  });

  it("persists tab changes", async () => {
    render(<TestHarness initialValue="activity" />);

    await act(async () => {
      screen.getByRole("button", { name: "Switch" }).click();
    });

    expect(window.localStorage.getItem("test.page-tab")).toBe("leaderboard");
  });

  it("prefers the provided initial value when asked to", async () => {
    window.localStorage.setItem("test.page-tab", "leaderboard");

    render(<TestHarness initialValue="activity" preferInitialValue />);

    expect(await screen.findByText("activity")).toBeInTheDocument();
    expect(window.localStorage.getItem("test.page-tab")).toBe("activity");
  });
});
