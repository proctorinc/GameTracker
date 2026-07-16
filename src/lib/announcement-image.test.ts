import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
  prepareAnnouncementImage,
} from "./announcement-image";

describe("prepareAnnouncementImage", () => {
  it("converts screenshots to bounded aspect-preserving WebP images", async () => {
    const source = await sharp({
      create: {
        width: 2400,
        height: 1200,
        channels: 3,
        background: "#2563eb",
      },
    })
      .png()
      .toBuffer();

    const result = await prepareAnnouncementImage({
      buffer: source,
      mimeType: "image/png",
    });
    const metadata = await sharp(result.buffer).metadata();

    expect(result.contentType).toBe("image/webp");
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBe(800);
  });

  it("rejects invalid and oversized uploads", async () => {
    await expect(
      prepareAnnouncementImage({ buffer: Buffer.from("text"), mimeType: "text/plain" }),
    ).rejects.toThrow(/upload an image/i);
    await expect(
      prepareAnnouncementImage({
        buffer: Buffer.alloc(ANNOUNCEMENT_IMAGE_MAX_BYTES + 1),
        mimeType: "image/png",
      }),
    ).rejects.toThrow(/8 MB/i);
  });
});
