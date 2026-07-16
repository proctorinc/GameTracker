import sharp from "sharp";
import { createProfileHueColor } from "./profile-colors";
import {
  DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS,
  normalizeTitleImageVerticalFocus,
} from "./title-image";

export { DEFAULT_TITLE_IMAGE_VERTICAL_FOCUS } from "./title-image";

const TITLE_IMAGE_OUTPUT_WIDTH = 1536;
const TITLE_IMAGE_OUTPUT_HEIGHT = 1024;
const TITLE_IMAGE_MIN_WIDTH = 256;
const TITLE_IMAGE_MIN_HEIGHT = 256;
export const TITLE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const TITLE_IMAGE_COLOR_OPTION_COUNT = 5;
const TITLE_IMAGE_HUE_BUCKET_SIZE = 18;
const TITLE_IMAGE_OUTPUT_MIME_TYPE = "image/webp";

export type TitleImageSource = "upload" | "openai";

export type TitleImageCandidate = {
  previewUrl: string;
  mimeType: string;
  width: number;
  height: number;
  colorOptions: string[];
  selectedColor: string;
  verticalFocus: number;
  source: TitleImageSource;
};

function rgbToHsl(input: { r: number; g: number; b: number }) {
  const red = input.r / 255;
  const green = input.g / 255;
  const blue = input.b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % 6;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }

  return {
    hue: Math.round((((hue * 60) % 360) + 360) % 360),
    saturation:
      delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1)) || 0,
    lightness,
  };
}

function getCropRegion(input: {
  sourceWidth: number;
  sourceHeight: number;
  verticalFocus: number;
}) {
  const { sourceWidth, sourceHeight } = input;
  const targetAspect = TITLE_IMAGE_OUTPUT_WIDTH / TITLE_IMAGE_OUTPUT_HEIGHT;
  const sourceAspect = sourceWidth / sourceHeight;

  if (sourceAspect > targetAspect) {
    const cropWidth = Math.round(sourceHeight * targetAspect);
    const left = Math.max(0, Math.round((sourceWidth - cropWidth) / 2));

    return {
      left,
      top: 0,
      width: cropWidth,
      height: sourceHeight,
    };
  }

  const cropHeight = Math.min(
    sourceHeight,
    Math.round(sourceWidth / targetAspect),
  );
  const maxTop = Math.max(0, sourceHeight - cropHeight);
  const top = Math.round(
    maxTop * (normalizeTitleImageVerticalFocus(input.verticalFocus) / 100),
  );

  return {
    left: 0,
    top,
    width: sourceWidth,
    height: cropHeight,
  };
}

export function getTitleColorOptionsFromRgb(input: { r: number; g: number; b: number }) {
  const { hue } = rgbToHsl(input);
  const offsets = [0, -24, 24, -48, 48];

  return offsets.map((offset) => createProfileHueColor(hue + offset));
}

export async function getTitleColorOptionsFromImageBuffer(
  imageBuffer: Buffer | Uint8Array,
) {
  const workingImage = sharp(Buffer.from(imageBuffer)).removeAlpha();
  const [{ dominant }, { data, info }] = await Promise.all([
    workingImage.clone().stats(),
    workingImage
      .clone()
      .resize(48, 48, {
        fit: "inside",
      })
      .raw()
      .toBuffer({ resolveWithObject: true }),
  ]);
  const hueBuckets = new Map<
    number,
    {
      count: number;
      weightedHue: number;
    }
  >();

  for (let index = 0; index < data.length; index += info.channels) {
    const pixel = {
      r: data[index] ?? 0,
      g: data[index + 1] ?? 0,
      b: data[index + 2] ?? 0,
    };
    const { hue, saturation, lightness } = rgbToHsl(pixel);

    if (saturation < 0.12 || lightness < 0.08 || lightness > 0.92) {
      continue;
    }

    const bucketKey =
      Math.round(hue / TITLE_IMAGE_HUE_BUCKET_SIZE) * TITLE_IMAGE_HUE_BUCKET_SIZE;
    const weight = 1 + saturation * 2;
    const current = hueBuckets.get(bucketKey) ?? {
      count: 0,
      weightedHue: 0,
    };

    hueBuckets.set(bucketKey, {
      count: current.count + 1,
      weightedHue: current.weightedHue + hue * weight,
    });
  }

  const sortedHues = Array.from(hueBuckets.values())
    .sort((left, right) => right.count - left.count)
    .map((entry) => entry.weightedHue / Math.max(entry.count, 1));
  const selectedHues: number[] = [];

  for (const hue of sortedHues) {
    if (
      selectedHues.some(
        (selectedHue) =>
          Math.min(
            Math.abs(selectedHue - hue),
            360 - Math.abs(selectedHue - hue),
          ) < 16,
      )
    ) {
      continue;
    }

    selectedHues.push(hue);

    if (selectedHues.length >= TITLE_IMAGE_COLOR_OPTION_COUNT) {
      break;
    }
  }

  const fallbackOptions = getTitleColorOptionsFromRgb(dominant);
  const combinedOptions = [
    ...selectedHues.map((hue) => createProfileHueColor(hue)),
    ...fallbackOptions,
  ];

  return Array.from(new Set(combinedOptions)).slice(
    0,
    TITLE_IMAGE_COLOR_OPTION_COUNT,
  );
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
    return (await getTitleColorOptionsFromImageBuffer(imageBuffer))[0] ?? "#2563eb";
  } catch {
    throw new Error("Could not process that image");
  }
}

export async function deriveTitleColorFromImageUrl(imageUrl: string) {
  return (await getTitleColorOptionsFromImageUrl(imageUrl))[0] ?? "#2563eb";
}

export async function getTitleColorOptionsFromImageUrl(imageUrl: string) {
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

  return getTitleColorOptionsFromImageBuffer(imageBuffer);
}

export async function prepareTitleImageAsset(input: {
  buffer: Buffer | Uint8Array;
  mimeType?: string | null;
  verticalFocus?: number | null;
  selectedColor?: string | null;
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

    const verticalFocus = normalizeTitleImageVerticalFocus(input.verticalFocus);
    const cropRegion = getCropRegion({
      sourceWidth: metadata.width,
      sourceHeight: metadata.height,
      verticalFocus,
    });
    const normalizedBuffer = await image
      .extract(cropRegion)
      .resize(TITLE_IMAGE_OUTPUT_WIDTH, TITLE_IMAGE_OUTPUT_HEIGHT, {
        fit: "fill",
      })
      .webp({
        quality: 86,
      })
      .toBuffer();
    const colorOptions = await getTitleColorOptionsFromImageBuffer(
      normalizedBuffer,
    );
    const selectedColor =
      colorOptions.find((color) => color === input.selectedColor) ??
      colorOptions[0];

    return {
      buffer: normalizedBuffer,
      mimeType: TITLE_IMAGE_OUTPUT_MIME_TYPE,
      width: TITLE_IMAGE_OUTPUT_WIDTH,
      height: TITLE_IMAGE_OUTPUT_HEIGHT,
      colorOptions,
      selectedColor,
      verticalFocus,
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
  verticalFocus?: number | null;
  selectedColor?: string | null;
}) {
  const asset = await prepareTitleImageAsset({
    buffer: input.buffer,
    mimeType: input.mimeType,
    verticalFocus: input.verticalFocus,
    selectedColor: input.selectedColor,
  });

  return {
    previewUrl: toTitleImageDataUrl(asset.buffer, asset.mimeType),
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    colorOptions: asset.colorOptions,
    selectedColor: asset.selectedColor,
    verticalFocus: asset.verticalFocus,
    source: input.source,
  } satisfies TitleImageCandidate;
}
