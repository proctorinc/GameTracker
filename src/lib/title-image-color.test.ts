import { afterEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  deriveTitleColorFromImageUrl,
  normalizeTitleImageUrl,
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
});
