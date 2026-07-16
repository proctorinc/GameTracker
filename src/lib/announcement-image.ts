import sharp from "sharp";

export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const ANNOUNCEMENT_IMAGE_MAX_EDGE = 1600;
const ANNOUNCEMENT_IMAGE_MIME_TYPE = "image/webp";

export async function prepareAnnouncementImage(input: {
  buffer: Buffer | Uint8Array;
  mimeType?: string | null;
}) {
  const sourceBuffer = Buffer.from(input.buffer);

  if (!input.mimeType?.startsWith("image/")) {
    throw new Error("Upload an image file");
  }

  if (sourceBuffer.length === 0) {
    throw new Error("Image file is empty");
  }

  if (sourceBuffer.length > ANNOUNCEMENT_IMAGE_MAX_BYTES) {
    throw new Error("Image files must be 8 MB or smaller");
  }

  try {
    const image = sharp(sourceBuffer, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    }).rotate();
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Could not read that image");
    }

    const buffer = await image
      .resize({
        width: ANNOUNCEMENT_IMAGE_MAX_EDGE,
        height: ANNOUNCEMENT_IMAGE_MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();

    return {
      buffer,
      contentType: ANNOUNCEMENT_IMAGE_MIME_TYPE,
    };
  } catch (error) {
    if (error instanceof Error && error.message === "Could not read that image") {
      throw error;
    }
    throw new Error("Could not process that image");
  }
}
