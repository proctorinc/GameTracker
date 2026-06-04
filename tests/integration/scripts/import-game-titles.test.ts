import { eq } from "drizzle-orm";
import { createClient } from "@libsql/client/node";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { vi } from "vitest";

const MIGRATIONS_DIR = path.join(
  process.cwd(),
  "src",
  "lib",
  "db",
  "migrations",
);
const TEMP_ROOT = path.join(process.cwd(), "tests", ".tmp");

async function withScriptTestDatabase(run: () => Promise<void>, name: string) {
  await mkdir(TEMP_ROOT, { recursive: true });
  const tempDir = await mkdtemp(path.join(TEMP_ROOT, `${name}-`));
  const dbPath = path.join(tempDir, "test.sqlite");
  const databaseUrl = `file:${dbPath}`;
  const client = createClient({ url: databaseUrl });

  try {
    const migrationFiles = (await readdir(MIGRATIONS_DIR))
      .filter((entry) => entry.endsWith(".sql"))
      .sort();

    for (const fileName of migrationFiles) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, fileName), "utf8");
      await client.executeMultiple(sql.replaceAll("--> statement-breakpoint", ""));
    }

    process.env.APP_ENV = "test";
    process.env.NODE_ENV = "test";
    process.env.NEXT_PUBLIC_APP_ENV = "test";
    process.env.DATABASE_URL = databaseUrl;
    process.env.CLERK_SIGN_IN_URL = "/login";
    process.env.CLERK_SIGN_UP_URL = "/register";
    vi.resetModules();

    await run();
  } finally {
    vi.resetModules();
    await client.close();
    await rm(tempDir, { force: true, recursive: true });
  }
}

describe("import-game-titles integration", () => {
  it("upserts by normalized title and preserves the existing primary key", async () => {
    await withScriptTestDatabase(async () => {
      const { importGameTitles } = await import("../../../scripts/import-game-titles");
      const { db, gameTitle } = await import("../../../src/lib/db");

      await importGameTitles([
        {
          title: "Lost Cities",
          normalizedTitle: "lost cities",
          color: "#111111",
          imageUrl: "https://example.com/lost-cities-175.jpg",
        },
      ]);

      const [firstInsert] = await db
        .select()
        .from(gameTitle)
        .where(eq(gameTitle.normalizedTitle, "lost cities"));

      expect(firstInsert).toBeDefined();

      await importGameTitles([
        {
          title: "Lost Cities",
          normalizedTitle: "lost cities",
          color: "#222222",
          imageUrl: "https://example.com/lost-cities-350.jpg",
        },
      ]);

      const [updated] = await db
        .select()
        .from(gameTitle)
        .where(eq(gameTitle.normalizedTitle, "lost cities"));

      expect(updated?.id).toBe(firstInsert?.id);
      expect(updated?.color).toBe("#222222");
      expect(updated?.imageUrl).toBe("https://example.com/lost-cities-350.jpg");
      expect(updated?.title).toBe("Lost Cities");
      expect(updated?.isUniversal).toBe(true);

      const allTitles = await db.select().from(gameTitle);
      expect(allTitles).toHaveLength(1);
    }, "import-game-titles");
  });
});
