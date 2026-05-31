import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { validateEnv } from "../src/lib/env-config";
import { db, gameTitle } from "../src/lib/db";

type InputGameTitle = {
  title: string;
  normalizedTitle?: string;
  color?: string;
  imageUrl?: string;
};

function usage() {
  console.error(
    "Usage: node --import tsx scripts/import-game-titles.ts <input.json>",
  );
}

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

export async function importGameTitles(rows: InputGameTitle[]) {
  await db.batch(
    rows.map((row) => {
      const title = row.title.trim();
      const normalizedTitle =
        row.normalizedTitle?.trim() || normalizeTitle(title);
      const color = row.color?.trim() || "#475569";
      const imageUrl = row.imageUrl?.trim() || "/images/skyjo.png";

      return db
        .insert(gameTitle)
        .values({
          title,
          normalizedTitle,
          color,
          imageUrl,
          isUniversal: true,
          createdAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: gameTitle.normalizedTitle,
          set: {
            title,
            color,
            imageUrl,
            isUniversal: true,
          },
        });
    }),
  );
}

function validateRow(row: unknown, index: number): InputGameTitle {
  if (!row || typeof row !== "object") {
    throw new Error(`Item ${index} is not an object.`);
  }

  const candidate = row as Record<string, unknown>;

  if (typeof candidate.title !== "string" || !candidate.title.trim()) {
    throw new Error(`Item ${index} is missing a non-empty "title".`);
  }

  if (
    candidate.normalizedTitle !== undefined &&
    typeof candidate.normalizedTitle !== "string"
  ) {
    throw new Error(`Item ${index} has a non-string "normalizedTitle".`);
  }

  if (candidate.color !== undefined && typeof candidate.color !== "string") {
    throw new Error(`Item ${index} has a non-string "color".`);
  }

  if (candidate.imageUrl !== undefined && typeof candidate.imageUrl !== "string") {
    throw new Error(`Item ${index} has a non-string "imageUrl".`);
  }

  return {
    title: candidate.title,
    normalizedTitle:
      typeof candidate.normalizedTitle === "string"
        ? candidate.normalizedTitle
        : undefined,
    color: typeof candidate.color === "string" ? candidate.color : undefined,
    imageUrl:
      typeof candidate.imageUrl === "string" ? candidate.imageUrl : undefined,
  };
}

async function main() {
  validateEnv(true);

  const [, , inputArg] = process.argv;
  if (!inputArg) {
    usage();
    process.exit(1);
  }

  const inputPath = resolve(process.cwd(), inputArg);
  const raw = await readFile(inputPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Input JSON must be an array.");
  }

  const rows = parsed.map((row, index) => validateRow(row, index));
  await importGameTitles(rows);

  console.log(`Imported ${rows.length} game titles into ${inputPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
