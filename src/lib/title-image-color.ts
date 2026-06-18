import sharp from "sharp";

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

  try {
    const { dominant } = await sharp(imageBuffer).removeAlpha().stats();
    return rgbToHex(dominant);
  } catch {
    throw new Error("Could not process that image");
  }
}
