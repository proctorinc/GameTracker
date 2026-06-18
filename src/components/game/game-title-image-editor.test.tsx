import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import GameTitleImageEditor from "./game-title-image-editor";

const routerRefresh = vi.fn();
const saveGameTitleImage = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("@/app/actions/game", () => ({
  saveGameTitleImage: (...args: unknown[]) => saveGameTitleImage(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: (...args: unknown[]) => toastError(...args),
  },
}));

const title = {
  id: "title-1",
  title: "Skyjo",
  normalizedTitle: "skyjo",
  color: "#123456",
  imageUrl: "https://example.com/original.png",
  defaultScoringMode: null,
  defaultEndingMode: null,
  defaultTrackRounds: null,
  defaultTargetRounds: null,
  defaultScoreThreshold: null,
  defaultScoreThresholdDirection: null,
  isUniversal: true,
  createdByUserId: null,
  mergedIntoGameTitleId: null,
  createdAt: "2025-01-01T00:00:00.000Z",
} as const;

describe("GameTitleImageEditor", () => {
  beforeEach(() => {
    routerRefresh.mockReset();
    saveGameTitleImage.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
  });

  it("starts with the current saved image preview", () => {
    renderWithProviders(<GameTitleImageEditor title={title} />);

    expect(screen.getByText(/Current saved image/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Skyjo preview/i })).toHaveAttribute(
      "src",
      title.imageUrl,
    );
  });

  it("updates the preview and save payload when the URL changes", async () => {
    saveGameTitleImage.mockResolvedValue({ id: title.id });

    renderWithProviders(<GameTitleImageEditor title={title} />);

    fireEvent.change(screen.getByLabelText(/Image URL/i), {
      target: { value: "https://example.com/updated.png" },
    });

    expect(screen.getByText(/Unsaved preview/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Skyjo preview/i })).toHaveAttribute(
      "src",
      "https://example.com/updated.png",
    );

    fireEvent.click(screen.getByRole("button", { name: /Save image/i }));

    await waitFor(() => {
      expect(saveGameTitleImage).toHaveBeenCalledWith({
        gameTitleId: title.id,
        imageUrl: "https://example.com/updated.png",
      });
    });
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("shows a broken preview state when the image fails to load", () => {
    renderWithProviders(<GameTitleImageEditor title={title} />);

    fireEvent.change(screen.getByLabelText(/Image URL/i), {
      target: { value: "https://example.com/broken.png" },
    });
    fireEvent.error(screen.getByRole("img", { name: /Skyjo preview/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Preview unavailable/i);
    expect(screen.getByText(/couldn't load that preview/i)).toBeInTheDocument();
  });
});
