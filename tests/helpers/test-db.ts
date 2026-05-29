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

    for (const fileName of migrationFiles) {
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
  process.env.SESSION_SECRET =
    "test-session-secret-for-integration-tests-1234567890";
  process.env.AUTH_MOCK_OTP = "123456";
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
