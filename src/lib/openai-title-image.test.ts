import { beforeEach, describe, expect, it, vi } from "vitest";

const getEnv = vi.fn();

vi.mock("./env", () => ({
  getEnv,
}));

vi.mock("ai", () => ({
  generateImage: vi.fn(),
  NoImageGeneratedError: {
    isInstance: () => false,
  },
}));

vi.mock("./title-image-color", () => ({
  buildGameTitleImagePrompt: (gameName: string) => `Prompt for ${gameName}`,
  buildTitleImageCandidate: vi.fn(),
}));

describe("generateGameTitleImageCandidate", () => {
  beforeEach(() => {
    getEnv.mockReset();
  });

  it("surfaces an actionable message when OpenAI is not configured", async () => {
    getEnv.mockReturnValue({});

    const { generateGameTitleImageCandidate } = await import(
      "./openai-title-image"
    );

    await expect(
      generateGameTitleImageCandidate({
        gameName: "Skyjo",
      }),
    ).rejects.toThrow(
      "AI title image generation is not available right now. Ask an administrator to add OPENAI_API_KEY to the server environment and redeploy.",
    );
  });
});
