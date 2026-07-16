import { z } from "zod";
import { deckBackStyles, type DeckBackStyle } from "@/lib/db/schema";

export const DEFAULT_DECK_BACK = {
  backStyle: "geometric" as DeckBackStyle,
  backPrimaryColor: "#4f46e5",
  backSecondaryColor: "#0f172a",
  backAccentColor: "#f8fafc",
};

const hexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a six-digit hex color");

export const deckBackConfigSchema = z.object({
  backStyle: z.enum(deckBackStyles),
  backPrimaryColor: hexColorSchema,
  backSecondaryColor: hexColorSchema,
  backAccentColor: hexColorSchema,
});

export type DeckBackConfig = z.infer<typeof deckBackConfigSchema>;

export function parseDeckBackConfig(input: DeckBackConfig) {
  return deckBackConfigSchema.parse(input);
}

export function isDeckBackConfigValid(input: DeckBackConfig) {
  return deckBackConfigSchema.safeParse(input).success;
}
