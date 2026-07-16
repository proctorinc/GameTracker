import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GameTitleImage from "./game-title-image";

describe("GameTitleImage", () => {
  it("exposes the game title color to the theme-aware border style", () => {
    render(
      <GameTitleImage color="#0f766e" size="lg">
        <span>Skyjo</span>
      </GameTitleImage>,
    );

    const titleImage = screen.getByText("Skyjo").parentElement?.parentElement;

    expect(titleImage).toHaveClass("game-title-image");
    expect(titleImage).toHaveClass("h-40", "rounded-xl", "border");
    expect(titleImage?.style.getPropertyValue("--game-title-color")).toBe(
      "#0f766e",
    );
    expect(titleImage?.style.borderColor).toBe(
      "var(--game-title-border-color)",
    );
  });

  it("uses the fallback title color for its border", () => {
    render(
      <GameTitleImage size="sm">
        <span>Untitled game</span>
      </GameTitleImage>,
    );

    const titleImage = screen.getByText("Untitled game").parentElement
      ?.parentElement;

    expect(titleImage?.style.getPropertyValue("--game-title-color")).toBe(
      "#64748b",
    );
  });

  it.each([
    ["sm", "h-14"],
    ["md", "h-28"],
    ["lg", "h-40"],
    ["xl", "h-64"],
  ] as const)("applies the %s card height", (size, heightClass) => {
    const { container } = render(<GameTitleImage size={size} />);

    expect(container.firstElementChild).toHaveClass(heightClass);
  });
});
