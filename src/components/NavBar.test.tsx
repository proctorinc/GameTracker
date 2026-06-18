import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../tests/helpers/render";
import NavBar from "./NavBar";

let pathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}));

describe("NavBar", () => {
  it("shows the pending invitation dot on the profile nav item", () => {
    pathname = "/dashboard";
    const { container } = renderWithProviders(
      <NavBar hasPendingFriendInvitations />,
    );

    const profileLink = screen.getByRole("link", { name: /profile/i });
    const dots = container.querySelectorAll(".bg-red-500");

    expect(profileLink).toBeInTheDocument();
    expect(dots).toHaveLength(1);
  });

  it("treats /activity as the active activity route", () => {
    pathname = "/activity";
    renderWithProviders(<NavBar />);

    expect(screen.getByRole("link", { name: /activity/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
