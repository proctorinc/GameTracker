import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import GameTitleImageEditor from "./game-title-image-editor";

const routerRefresh = vi.fn();
const generateGameTitleImage = vi.fn();
const getSavedGameTitleImageOptions = vi.fn();
const prepareUploadedGameTitleImage = vi.fn();
const saveGameTitleImage = vi.fn();
const saveGeneratedGameTitleImage = vi.fn();
const saveUploadedGameTitleImage = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefresh,
  }),
}));

vi.mock("@/app/actions/game", () => ({
  generateGameTitleImage: (...args: unknown[]) => generateGameTitleImage(...args),
  getSavedGameTitleImageOptions: (...args: unknown[]) =>
    getSavedGameTitleImageOptions(...args),
  prepareUploadedGameTitleImage: (...args: unknown[]) =>
    prepareUploadedGameTitleImage(...args),
  saveGameTitleImage: (...args: unknown[]) => saveGameTitleImage(...args),
  saveGeneratedGameTitleImage: (...args: unknown[]) =>
    saveGeneratedGameTitleImage(...args),
  saveUploadedGameTitleImage: (...args: unknown[]) =>
    saveUploadedGameTitleImage(...args),
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
  imageVerticalFocus: 50,
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
    generateGameTitleImage.mockReset();
    getSavedGameTitleImageOptions.mockReset();
    prepareUploadedGameTitleImage.mockReset();
    saveGameTitleImage.mockReset();
    saveGeneratedGameTitleImage.mockReset();
    saveUploadedGameTitleImage.mockReset();
    toastSuccess.mockReset();
    toastError.mockReset();
    vi.restoreAllMocks();
    vi.stubGlobal(
      "URL",
      Object.assign(globalThis.URL, {
        createObjectURL: vi.fn(() => "blob:preview"),
        revokeObjectURL: vi.fn(),
      }),
    );
    getSavedGameTitleImageOptions.mockResolvedValue({
      colorOptions: ["#123456", "#345678", "#56789a", "#789abc", "#9abcde"],
      selectedColor: "#123456",
      verticalFocus: 50,
    });
  });

  it("starts with the current saved image preview", () => {
    renderWithProviders(<GameTitleImageEditor title={title} />);

    expect(screen.getByText(/Current saved image/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Skyjo preview/i })).toHaveAttribute(
      "src",
      title.imageUrl,
    );
  });

  it("shows an upload preview and saves the selected file", async () => {
    prepareUploadedGameTitleImage.mockResolvedValue({
      previewUrl: "data:image/webp;base64,upload",
      mimeType: "image/webp",
      width: 1536,
      height: 1024,
      colorOptions: ["#123456", "#345678", "#56789a"],
      selectedColor: "#123456",
      verticalFocus: 50,
      source: "upload",
    });
    saveUploadedGameTitleImage.mockResolvedValue({ id: title.id });

    renderWithProviders(<GameTitleImageEditor title={title} />);

    const file = new File(["image"], "cover.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText(/Image file/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Upload preview/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("img", { name: /Skyjo preview/i })).toHaveAttribute(
      "src",
      "blob:preview",
    );

    fireEvent.click(screen.getAllByRole("button", { name: /Confirm and save/i })[0]);

    await waitFor(() => {
      expect(saveUploadedGameTitleImage).toHaveBeenCalledTimes(1);
    });
    const formData = saveUploadedGameTitleImage.mock.calls[0]?.[0] as FormData;
    expect(formData.get("selectedColor")).toBe("#123456");
    expect(formData.get("imageVerticalFocus")).toBe("50");
    expect(routerRefresh).toHaveBeenCalled();
  });

  it("generates AI title art, previews it, and saves it", async () => {
    generateGameTitleImage.mockResolvedValue({
      previewUrl: "data:image/webp;base64,abc123",
      mimeType: "image/webp",
      width: 1536,
      height: 1024,
      colorOptions: ["#0f766e", "#2563eb", "#8b5cf6"],
      selectedColor: "#0f766e",
      verticalFocus: 50,
      source: "openai",
      prompt: "custom prompt",
      model: "gpt-image-2",
    });
    saveGeneratedGameTitleImage.mockResolvedValue({ id: title.id });

    renderWithProviders(<GameTitleImageEditor title={title} />);

    fireEvent.change(screen.getByLabelText(/Game name/i), {
      target: { value: "Skyjo Deluxe" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate image/i }));

    await waitFor(() => {
      expect(generateGameTitleImage).toHaveBeenCalledWith({
        gameTitleId: title.id,
        gameName: "Skyjo Deluxe",
        prompt: expect.stringContaining("Skyjo Deluxe"),
      });
    });

    expect(screen.getByText(/Generated preview/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: /Confirm and save/i })[1],
      ).not.toBeDisabled();
    });
    fireEvent.click(screen.getAllByRole("button", { name: /Confirm and save/i })[1]);

    await waitFor(() => {
      expect(saveGeneratedGameTitleImage).toHaveBeenCalledWith({
        gameTitleId: title.id,
        previewUrl: "data:image/webp;base64,abc123",
        selectedColor: "#0f766e",
        imageVerticalFocus: 50,
      });
    });
  });

  it("lets the user adjust the focus slider and choose a suggested color", async () => {
    prepareUploadedGameTitleImage.mockResolvedValue({
      previewUrl: "data:image/webp;base64,upload",
      mimeType: "image/webp",
      width: 1536,
      height: 1024,
      colorOptions: ["#111111", "#222222", "#333333"],
      selectedColor: "#111111",
      verticalFocus: 50,
      source: "upload",
    });

    renderWithProviders(<GameTitleImageEditor title={title} />);

    fireEvent.change(screen.getByLabelText(/Image file/i), {
      target: {
        files: [new File(["image"], "cover.png", { type: "image/png" })],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/Upload preview/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Vertical image focus/i), {
      target: { value: "72" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Choose color #222222/i }));

    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Skyjo preview/i })).toHaveStyle({
      objectPosition: "50% 72%",
    });
  });

  it("saves crop changes for the currently uploaded image", async () => {
    saveGameTitleImage.mockResolvedValue({ id: title.id });

    renderWithProviders(<GameTitleImageEditor title={title} />);

    await waitFor(() => {
      expect(getSavedGameTitleImageOptions).toHaveBeenCalledWith({
        gameTitleId: title.id,
      });
    });

    fireEvent.change(screen.getByLabelText(/Vertical image focus/i), {
      target: { value: "68" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Save crop/i }));

    await waitFor(() => {
      expect(saveGameTitleImage).toHaveBeenCalledWith({
        gameTitleId: title.id,
        imageUrl: title.imageUrl,
        imageVerticalFocus: 68,
        selectedColor: "#123456",
      });
    });
  });

  it("shows saved-image color options and saves the selected one", async () => {
    saveGameTitleImage.mockResolvedValue({ id: title.id });

    renderWithProviders(<GameTitleImageEditor title={title} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Choose color #345678/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Choose color #345678/i }));
    fireEvent.click(screen.getByRole("button", { name: /Save changes/i }));

    await waitFor(() => {
      expect(saveGameTitleImage).toHaveBeenCalledWith({
        gameTitleId: title.id,
        imageUrl: title.imageUrl,
        imageVerticalFocus: 50,
        selectedColor: "#345678",
      });
    });
  });

  it("shows a broken preview state when the image fails to load", () => {
    renderWithProviders(<GameTitleImageEditor title={title} />);

    fireEvent.error(screen.getByRole("img", { name: /Skyjo preview/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/Preview unavailable/i);
  });
});
