import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AdminPage from "./page";

const requireAdminPageUser = vi.fn();
const getPlayerRankHealthCheck = vi.fn();
const areCardsEnabled = vi.fn();

vi.mock("./admin-guard", () => ({
  requireAdminPageUser: () => requireAdminPageUser(),
}));

vi.mock("@/lib/db/store/player-rank.store", () => ({
  getPlayerRankHealthCheck: () => getPlayerRankHealthCheck(),
}));

vi.mock("@/lib/db/store/feature-flags.store", () => ({
  areCardsEnabled: () => areCardsEnabled(),
}));

vi.mock("@/app/actions/feature-flags", () => ({
  setCardsFeatureEnabled: vi.fn(),
}));

describe("AdminPage", () => {
  it("includes the dashboard style sandbox link", async () => {
    requireAdminPageUser.mockResolvedValue({
      id: "admin-1",
      role: "admin",
    });
    getPlayerRankHealthCheck.mockResolvedValue({
      status: "good",
      label: "Healthy",
      affectedGameCount: 0,
    });
    areCardsEnabled.mockResolvedValue(false);

    render(await AdminPage());

    expect(
      screen.getByRole("switch", { name: /enable cards/i }),
    ).toHaveAttribute("aria-checked", "false");

    expect(
      screen.getByRole("link", { name: /dashboard style sandbox/i }),
    ).toHaveAttribute("href", "/admin/dashboard-style-demo");
    expect(
      screen.getByText(/experimental map-and-scroll dashboard vibe/i),
    ).toBeInTheDocument();
  });
});
