import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileBackgroundSelector } from "./profile-background-selector";

describe("ProfileBackgroundSelector", () => {
  it("supports selecting no profile background", () => {
    const onSelect = vi.fn();

    render(
      <ProfileBackgroundSelector
        hidePreview
        avatarUrl={null}
        color="#2563eb"
        firstName="Ada"
        lastName="Lovelace"
        onSelect={onSelect}
      />,
    );

    const noBackground = screen.getByRole("button", {
      name: "Choose no background",
    });
    expect(noBackground).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(noBackground);

    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
