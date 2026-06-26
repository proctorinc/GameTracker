import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import RankChip from "./RankChip";

describe("RankChip", () => {
  it("renders positive rank deltas with the shared token pill styling", () => {
    renderWithProviders(<RankChip delta="+40" />);

    const chip = screen.getByText("+40").parentElement;

    expect(chip).toHaveClass("bg-background/90", "text-foreground");
    expect(chip).toContainElement(screen.getByAltText("SL"));
  });

  it("renders negative rank deltas with the shared loss styling", () => {
    renderWithProviders(<RankChip delta="-12" tone="negative" />);

    const chip = screen.getByText("-12").parentElement;

    expect(chip).toHaveClass("bg-rose-500/12", "text-rose-700");
  });

  it("renders neutral rank deltas for embedded custom surfaces", () => {
    renderWithProviders(<RankChip delta="+8" tone="neutral" />);

    const chip = screen.getByText("+8").parentElement;

    expect(chip).toHaveClass("bg-muted/70", "text-foreground");
  });
});
