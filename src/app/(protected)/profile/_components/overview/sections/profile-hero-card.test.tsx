import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../../../../../tests/helpers/render";
import { ProfileHeroCard } from "./profile-hero-card";

const setActiveTab = vi.fn();
const profileState = {
  activeTab: "stats",
  user: {
    id: "viewer",
    role: "user",
    firstName: "Maya",
    lastName: "Viewer",
    color: "#2563eb",
    avatarUrl: null,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
};

vi.mock("../profile-overview-provider", () => ({
  useProfileOverview: () => ({
    ...profileState,
    setActiveTab,
  }),
}));

describe("ProfileHeroCard", () => {
  beforeEach(() => {
    setActiveTab.mockReset();
    profileState.activeTab = "stats";
    profileState.user.role = "user";
  });

  it("shows an admin shortcut next to settings for admins", () => {
    profileState.user.role = "admin";

    renderWithProviders(<ProfileHeroCard />);

    expect(screen.getByRole("button", { name: "Admin tools" })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(
      screen.getByRole("button", { name: "Profile settings" }),
    ).toBeInTheDocument();
  });

  it("does not show the admin shortcut to regular users", () => {
    renderWithProviders(<ProfileHeroCard />);

    expect(
      screen.queryByRole("button", { name: "Admin tools" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the settings button behavior", () => {
    renderWithProviders(<ProfileHeroCard />);

    fireEvent.click(
      screen.getByRole("button", { name: "Profile settings" }),
    );

    expect(setActiveTab).toHaveBeenCalledWith("settings");
  });
});
