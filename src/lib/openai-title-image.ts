import { openai as defaultOpenAiProvider, createOpenAI } from "@ai-sdk/openai";
import { generateImage, NoImageGeneratedError } from "ai";
import { getEnv } from "./env";
import {
  buildGameTitleImagePrompt,
  buildTitleImageCandidate,
  type TitleImageCandidate,
} from "./title-image-color";

const OPENAI_TITLE_IMAGE_MODEL = "gpt-image-1";

function getOpenAiApiKey() {
  const env = getEnv();

  if (!env.OPENAI_API_KEY) {
    throw new Error("OpenAI image generation is not configured");
  }

  return env.OPENAI_API_KEY;
}

function getOpenAiProvider() {
  const apiKey = getOpenAiApiKey();

  if (process.env.OPENAI_API_KEY === apiKey) {
    return defaultOpenAiProvider;
  }

  return createOpenAI({ apiKey });
}

export async function generateGameTitleImageCandidate(input: {
  gameName: string;
  prompt?: string | null;
}) {
  const prompt =
    input.prompt?.trim() || buildGameTitleImagePrompt(input.gameName);
  let generatedImage: Uint8Array;

  try {
    const { image } = await generateImage({
      model: getOpenAiProvider().image(OPENAI_TITLE_IMAGE_MODEL),
      prompt,
      size: "1536x1024",
      abortSignal: AbortSignal.timeout(60_000),
    });
    generatedImage = image.uint8Array;
  } catch (error) {
    if (NoImageGeneratedError.isInstance(error)) {
      throw new Error("OpenAI did not return a title image");
    }

    throw error;
  }

  const candidate = await buildTitleImageCandidate({
    buffer: Buffer.from(generatedImage),
    mimeType: "image/png",
    source: "openai",
  });

  return {
    ...candidate,
    prompt,
    model: OPENAI_TITLE_IMAGE_MODEL,
  };
}

export type GeneratedTitleImageCandidate = TitleImageCandidate & {
  prompt: string;
  model: string;
};
