import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProfilePicture from "./profile-picture";

const user = {
  id: "user-1",
  firstName: "Ada",
  lastName: "Lovelace",
  color: "#7c3aed",
};

describe("ProfilePicture", () => {
  it("uses avatarUrl as the decorative profile background", () => {
    const { container } = render(
      <ProfilePicture
        user={{ ...user, avatarUrl: "/images/profiles/rocks.png" }}
      />,
    );

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector('img[aria-hidden="true"]')).toHaveAttribute(
      "src",
      expect.stringContaining("rocks.png"),
    );
  });

  it("does not render a Clerk image as the profile picture", () => {
    const { container } = render(
      <ProfilePicture
        user={{
          ...user,
          avatarUrl: "https://img.clerk.com/example/avatar.png",
        }}
      />,
    );

    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector('img[aria-hidden="true"]')).toBeNull();
  });
});
