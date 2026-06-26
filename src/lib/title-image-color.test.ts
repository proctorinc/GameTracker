import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  buildGameTitleImagePrompt,
  buildTitleImageCandidate,
  deriveTitleColorFromImageBuffer,
  deriveTitleColorFromImageUrl,
  normalizeTitleImageUrl,
  prepareTitleImageAsset,
} from "./title-image-color";

describe("title image color helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes valid remote image URLs", () => {
    expect(normalizeTitleImageUrl(" https://example.com/image.png ")).toBe(
      "https://example.com/image.png",
    );
  });

  it("rejects unsupported URL schemes", () => {
    expect(() => normalizeTitleImageUrl("ftp://example.com/image.png")).toThrow(
      /http/i,
    );
  });

  it("extracts a normalized hex color from an image", async () => {
    const imageBuffer = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 12, g: 34, b: 56 },
      },
    })
      .png()
      .toBuffer();

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(imageBuffer, {
        status: 200,
        headers: {
          "content-type": "image/png",
        },
      }),
    );

    await expect(
      deriveTitleColorFromImageUrl("https://example.com/image.png"),
    ).resolves.toBe("#082838");
  });

  it("extracts a normalized hex color from raw image bytes", async () => {
    const imageBuffer = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .png()
      .toBuffer();

    await expect(deriveTitleColorFromImageBuffer(imageBuffer)).resolves.toBe(
      "#182838",
    );
  });

  it("throws a controlled error when the response is not an image", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not an image", {
        status: 200,
        headers: {
          "content-type": "text/plain",
        },
      }),
    );

    await expect(
      deriveTitleColorFromImageUrl("https://example.com/file.txt"),
    ).rejects.toThrow(/did not return an image/i);
  });

  it("normalizes uploaded images into a landscape webp asset", async () => {
    const imageBuffer = await sharp({
      create: {
        width: 600,
        height: 600,
        channels: 3,
        background: { r: 90, g: 120, b: 150 },
      },
    })
      .png()
      .toBuffer();

    const asset = await prepareTitleImageAsset({
      buffer: imageBuffer,
      mimeType: "image/png",
    });

    expect(asset.mimeType).toBe("image/webp");
    expect(asset.width).toBe(1536);
    expect(asset.height).toBe(1024);
    expect(asset.color).toMatch(/^#/);
  });

  it("rejects non-image uploads", async () => {
    await expect(
      prepareTitleImageAsset({
        buffer: Buffer.from("not an image"),
        mimeType: "text/plain",
      }),
    ).rejects.toThrow(/upload an image/i);
  });

  it("builds a preview candidate from raw image bytes", async () => {
    const imageBuffer = await sharp({
      create: {
        width: 400,
        height: 400,
        channels: 3,
        background: { r: 10, g: 20, b: 30 },
      },
    })
      .png()
      .toBuffer();

    const candidate = await buildTitleImageCandidate({
      buffer: imageBuffer,
      mimeType: "image/png",
      source: "openai",
    });

    expect(candidate.previewUrl.startsWith("data:image/webp;base64,")).toBe(true);
    expect(candidate.source).toBe("openai");
    expect(candidate.width).toBe(1536);
    expect(candidate.height).toBe(1024);
  });

  it("builds the default AI prompt from the provided game name", () => {
    expect(buildGameTitleImagePrompt("Skyjo")).toContain("game Skyjo");
    expect(buildGameTitleImagePrompt("Skyjo")).toContain("Don't include people or words");
  });
});
