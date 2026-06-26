import sharp from "sharp";

const TITLE_IMAGE_OUTPUT_WIDTH = 1536;
const TITLE_IMAGE_OUTPUT_HEIGHT = 1024;
const TITLE_IMAGE_MIN_WIDTH = 256;
const TITLE_IMAGE_MIN_HEIGHT = 256;
export const TITLE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const TITLE_IMAGE_OUTPUT_MIME_TYPE = "image/webp";

export type TitleImageSource = "upload" | "openai";

export type TitleImageCandidate = {
  previewUrl: string;
  mimeType: string;
  width: number;
  height: number;
  color: string;
  source: TitleImageSource;
};

function componentToHex(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0");
}

function rgbToHex(input: { r: number; g: number; b: number }) {
  return `#${componentToHex(input.r)}${componentToHex(input.g)}${componentToHex(
    input.b,
  )}`;
}

export function normalizeTitleImageUrl(input: string | null | undefined) {
  const trimmed = input?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new Error("Enter a valid image URL");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Image URLs must start with http:// or https://");
  }

  return parsedUrl.toString();
}

export function buildGameTitleImagePrompt(gameName: string) {
  const safeGameName = gameName.trim() || "Unknown game";

  return [
    `Generate an image of the box art for the game ${safeGameName}. If this is a real game, try and provide an accurate box art image of the game.`,
    "Don't make it realistic, make it box art.",
    "Don't include people or words. Just a visual that represents box art for the game.",
    "Make a landscape image.",
  ].join("\n\n");
}

export function assertSupportedTitleImageMimeType(mimeType: string | null | undefined) {
  if (!mimeType?.startsWith("image/")) {
    throw new Error("Upload an image file");
  }
}

export function parseTitleImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Generated image preview is invalid");
  }

  const [, mimeType, base64] = match;
  assertSupportedTitleImageMimeType(mimeType);

  return {
    mimeType,
    buffer: Buffer.from(base64, "base64"),
  };
}

export function toTitleImageDataUrl(
  buffer: Buffer,
  mimeType = TITLE_IMAGE_OUTPUT_MIME_TYPE,
) {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export async function deriveTitleColorFromImageBuffer(
  imageBuffer: Buffer | Uint8Array,
) {
  try {
    const { dominant } = await sharp(Buffer.from(imageBuffer))
      .removeAlpha()
      .stats();
    return rgbToHex(dominant);
  } catch {
    throw new Error("Could not process that image");
  }
}

export async function deriveTitleColorFromImageUrl(imageUrl: string) {
  const response = await fetch(imageUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error("Could not download that image");
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.startsWith("image/")) {
    throw new Error("That URL did not return an image");
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());

  return deriveTitleColorFromImageBuffer(imageBuffer);
}

export async function prepareTitleImageAsset(input: {
  buffer: Buffer | Uint8Array;
  mimeType?: string | null;
}) {
  const sourceBuffer = Buffer.from(input.buffer);

  if (sourceBuffer.length === 0) {
    throw new Error("Image file is empty");
  }

  if (sourceBuffer.length > TITLE_IMAGE_MAX_BYTES) {
    throw new Error("Image files must be 8 MB or smaller");
  }

  assertSupportedTitleImageMimeType(input.mimeType);

  try {
    const image = sharp(sourceBuffer, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    }).rotate();
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Could not read that image");
    }

    if (
      metadata.width < TITLE_IMAGE_MIN_WIDTH ||
      metadata.height < TITLE_IMAGE_MIN_HEIGHT
    ) {
      throw new Error("Image must be at least 256x256 pixels");
    }

    const normalizedBuffer = await image
      .resize(TITLE_IMAGE_OUTPUT_WIDTH, TITLE_IMAGE_OUTPUT_HEIGHT, {
        fit: "cover",
        position: "attention",
      })
      .webp({
        quality: 86,
      })
      .toBuffer();
    const color = await deriveTitleColorFromImageBuffer(normalizedBuffer);

    return {
      buffer: normalizedBuffer,
      mimeType: TITLE_IMAGE_OUTPUT_MIME_TYPE,
      width: TITLE_IMAGE_OUTPUT_WIDTH,
      height: TITLE_IMAGE_OUTPUT_HEIGHT,
      color,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error("Could not process that image");
  }
}

export async function buildTitleImageCandidate(input: {
  buffer: Buffer | Uint8Array;
  mimeType?: string | null;
  source: TitleImageSource;
}) {
  const asset = await prepareTitleImageAsset({
    buffer: input.buffer,
    mimeType: input.mimeType,
  });

  return {
    previewUrl: toTitleImageDataUrl(asset.buffer, asset.mimeType),
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    color: asset.color,
    source: input.source,
  } satisfies TitleImageCandidate;
}
