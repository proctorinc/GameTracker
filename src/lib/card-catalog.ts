import { z } from "zod";
import type {
  CardRarity,
  CardRendererType,
  CardSubjectType,
} from "@/lib/db/schema";

export const CARD_RARITIES: readonly CardRarity[] = [
  "common",
  "uncommon",
  "rare",
  "legendary",
];

export const CARD_RARITY_LABELS: Record<CardRarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare",
  legendary: "Legendary",
};

export const GAME_PIECE_KINDS = [
  "playing-card",
  "die",
  "meeple",
  "pawn",
  "domino",
  "cube",
  "tile",
  "first-player",
  "miniature",
  "trophy",
] as const;

const gamePieceConfigSchema = z.object({
  piece: z.enum(GAME_PIECE_KINDS),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#7c3aed"),
});
const skyjoNumberConfigSchema = z.object({
  value: z.number().int().min(-2).max(12),
});
const emptyConfigSchema = z.object({});

export type GamePieceConfig = z.infer<typeof gamePieceConfigSchema>;
export type SkyjoNumberConfig = z.infer<typeof skyjoNumberConfigSchema>;
export type CardRendererConfig =
  | GamePieceConfig
  | SkyjoNumberConfig
  | Record<string, never>;

export function parseCardRendererConfig(
  renderer: CardRendererType,
  configJson: string,
): CardRendererConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(configJson);
  } catch {
    throw new Error("Card template configuration must be valid JSON");
  }

  if (renderer === "game_piece") return gamePieceConfigSchema.parse(parsed);
  if (renderer === "skyjo_number") return skyjoNumberConfigSchema.parse(parsed);
  return emptyConfigSchema.parse(parsed);
}

export type CollectibleCardSubject =
  | {
      type: "friend";
      id: string;
      name: string;
      avatarUrl: string | null;
      color: string;
    }
  | {
      type: "game_title";
      id: string;
      name: string;
      imageUrl: string;
      color: string;
    };

export type CollectibleCardViewModel = {
  instanceId: string | null;
  identityKey: string;
  deckName: string;
  deckLabel: string;
  templateId: string;
  templateSlug: string;
  name: string;
  description: string;
  rarity: CardRarity;
  renderer: CardRendererType;
  config: CardRendererConfig;
  subjectType: CardSubjectType | null;
  subjectId: string | null;
  subject: CollectibleCardSubject | null;
  unavailable: boolean;
  collected: boolean;
  quantity: number;
};

export function getCardIdentityKey(input: {
  cardTemplateId: string;
  subjectType?: CardSubjectType | null;
  subjectId?: string | null;
}) {
  return [
    input.cardTemplateId,
    input.subjectType ?? "static",
    input.subjectId ?? "static",
  ].join(":");
}

export type DeckOdds = Record<CardRarity, number>;

export function validateDeckOdds(odds: DeckOdds) {
  const total = CARD_RARITIES.reduce((sum, rarity) => sum + odds[rarity], 0);
  if (total !== 100 || CARD_RARITIES.some((rarity) => odds[rarity] < 0)) {
    throw new Error("Rarity odds must be non-negative and total 100");
  }
  return odds;
}

export function rollAvailableRarity(
  odds: DeckOdds,
  available: ReadonlySet<CardRarity>,
  random = Math.random,
): CardRarity {
  const entries = CARD_RARITIES.filter((rarity) => available.has(rarity)).map(
    (rarity) => ({ rarity, weight: odds[rarity] }),
  );
  if (entries.length === 0) throw new Error("This deck has no available cards");

  const weighted = entries.filter((entry) => entry.weight > 0);
  const pool = weighted.length > 0 ? weighted : entries.map((entry) => ({ ...entry, weight: 1 }));
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * total;
  for (const entry of pool) {
    if (roll < entry.weight) return entry.rarity;
    roll -= entry.weight;
  }
  return pool[pool.length - 1]!.rarity;
}

export function drawCardCandidates<
  T extends { identityKey: string; rarity: CardRarity },
>(input: {
  candidates: T[];
  odds: DeckOdds;
  count: number;
  random?: () => number;
}) {
  const random = input.random ?? Math.random;
  const byRarity = new Map<CardRarity, T[]>();
  for (const rarity of CARD_RARITIES) {
    byRarity.set(
      rarity,
      input.candidates.filter((candidate) => candidate.rarity === rarity),
    );
  }
  const available = new Set(
    CARD_RARITIES.filter((rarity) => (byRarity.get(rarity)?.length ?? 0) > 0),
  );
  const used = new Set<string>();
  return Array.from({ length: input.count }, () => {
    const rarity = rollAvailableRarity(input.odds, available, random);
    const fullPool = byRarity.get(rarity)!;
    const unused = fullPool.filter((candidate) => !used.has(candidate.identityKey));
    const pool = unused.length > 0 ? unused : fullPool;
    const candidate = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]!;
    used.add(candidate.identityKey);
    return { candidate, rarity };
  });
}
