import Database from "better-sqlite3";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { vi } from "vitest";

const TEMP_ROOT = path.join(process.cwd(), "tests", ".tmp");
const MIGRATIONS_DIR = path.join(process.cwd(), "src", "lib", "db", "migrations");

async function applyMigrations(dbPath: string) {
  const sqlite = new Database(dbPath);

  try {
    sqlite.pragma("foreign_keys = ON");

    const migrationFiles = (await readdir(MIGRATIONS_DIR))
      .filter((entry) => entry.endsWith(".sql"))
      .sort();
    const effectiveMigrationFiles = migrationFiles.filter((fileName) => {
      if (!migrationFiles.includes("0011_new_revanche.sql")) {
        return true;
      }

      return ![
        "0005_player_rank.sql",
        "0006_player_rank_leaderboard_disabled.sql",
        "0007_link_only_invites.sql",
        "0008_player_rank_history.sql",
        "0009_fixed_friend_invite_link.sql",
        "0010_no_score_placements.sql",
      ].includes(fileName);
    });

    for (const fileName of effectiveMigrationFiles) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, fileName), "utf8");
      sqlite.exec(sql);
    }
  } finally {
    sqlite.close();
  }
}

export type TestDatabaseContext = {
  databaseUrl: string;
  dbPath: string;
  cleanup: () => Promise<void>;
};

export async function createTestDatabase(
  name = "integration",
): Promise<TestDatabaseContext> {
  await mkdir(TEMP_ROOT, { recursive: true });
  const tempDir = await mkdtemp(path.join(TEMP_ROOT, `${name}-`));
  const dbPath = path.join(tempDir, "test.sqlite");
  const databaseUrl = `file:${dbPath}`;

  await applyMigrations(dbPath);

  process.env.APP_ENV = "test";
  process.env.NODE_ENV = "test";
  process.env.NEXT_PUBLIC_APP_ENV = "test";
  process.env.DATABASE_URL = databaseUrl;
  process.env.CLERK_SIGN_IN_URL = "/login";
  process.env.CLERK_SIGN_UP_URL = "/register";
  vi.resetModules();

  return {
    databaseUrl,
    dbPath,
    cleanup: async () => {
      vi.resetModules();
      await rm(tempDir, { force: true, recursive: true });
    },
  };
}

export async function withTestDatabase<T>(
  run: (context: TestDatabaseContext) => Promise<T>,
  name?: string,
): Promise<T> {
  const context = await createTestDatabase(name);

  try {
    return await run(context);
  } finally {
    await context.cleanup();
  }
}
