import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  buildGameTitleImagePrompt,
  buildTitleImageCandidate,
  deriveTitleColorFromImageBuffer,
  deriveTitleColorFromImageUrl,
  DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS,
  getTitleColorOptionsFromImageBuffer,
  getTitleColorOptionsFromRgb,
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
    ).resolves.toMatch(/^#/);
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

    await expect(deriveTitleColorFromImageBuffer(imageBuffer)).resolves.toMatch(
      /^#/,
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
    expect(asset.selectedColor).toMatch(/^#/);
    expect(asset.colorOptions).toHaveLength(5);
    expect(asset.verticalFocus).toBe(DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS);
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
    expect(candidate.colorOptions).toHaveLength(5);
    expect(candidate.selectedColor).toBe(candidate.colorOptions[0]);
    expect(candidate.verticalFocus).toBe(DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS);
  });

  it("returns five distinct theme-aligned color options from an image color", () => {
    const options = getTitleColorOptionsFromRgb({ r: 220, g: 120, b: 40 });

    expect(new Set(options).size).toBe(5);
    expect(options.every((option) => /^#/.test(option))).toBe(true);
  });

  it("extracts multiple prominent colors from the image itself", async () => {
    const imageBuffer = await sharp({
      create: {
        width: 900,
        height: 300,
        channels: 3,
        background: { r: 200, g: 40, b: 40 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 300,
              height: 300,
              channels: 3,
              background: { r: 30, g: 150, b: 80 },
            },
          })
            .png()
            .toBuffer(),
          top: 0,
          left: 300,
        },
        {
          input: await sharp({
            create: {
              width: 300,
              height: 300,
              channels: 3,
              background: { r: 50, g: 90, b: 210 },
            },
          })
            .png()
            .toBuffer(),
          top: 0,
          left: 600,
        },
      ])
      .png()
      .toBuffer();

    const options = await getTitleColorOptionsFromImageBuffer(imageBuffer);

    expect(options).toHaveLength(5);
    expect(new Set(options).size).toBeGreaterThanOrEqual(3);
  });

  it("applies custom vertical focus when cropping tall uploads", async () => {
    const imageBuffer = await sharp({
      create: {
        width: 600,
        height: 1200,
        channels: 3,
        background: { r: 220, g: 40, b: 40 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 600,
              height: 600,
              channels: 3,
              background: { r: 40, g: 80, b: 220 },
            },
          })
            .png()
            .toBuffer(),
          top: 600,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    const topFocused = await prepareTitleImageAsset({
      buffer: imageBuffer,
      mimeType: "image/png",
      verticalFocus: 0,
    });
    const bottomFocused = await prepareTitleImageAsset({
      buffer: imageBuffer,
      mimeType: "image/png",
      verticalFocus: 100,
    });

    expect(topFocused.verticalFocus).toBe(0);
    expect(bottomFocused.verticalFocus).toBe(100);
    expect(topFocused.selectedColor).not.toBe(bottomFocused.selectedColor);
  });

  it("builds the default AI prompt from the provided game name", () => {
    expect(buildGameTitleImagePrompt("Skyjo")).toContain("game Skyjo");
    expect(buildGameTitleImagePrompt("Skyjo")).toContain("Don't include people or words");
  });
});
