import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@libsql/client/node";
import { validateEnv } from "../src/lib/env-config";

type CliOptions = {
  apply: boolean;
};

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type Journal = {
  version: string;
  dialect: string;
  entries: JournalEntry[];
};

type AppliedMigrationRow = {
  hash: string;
  created_at: number | null;
};

type RepairCheck = {
  name: string;
  ok: boolean;
  details: string;
};

const MIGRATIONS_DIR = path.resolve("src/lib/db/migrations");
const JOURNAL_PATH = path.join(MIGRATIONS_DIR, "meta", "_journal.json");

function parseArgs(argv: string[]): CliOptions {
  let apply = false;

  for (const arg of argv) {
    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  return { apply };
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node --import tsx scripts/repair-drizzle-migration-state.ts [--apply]",
      "",
      "Behavior:",
      "  Dry run is the default and prints the detected migration/schema drift.",
      "  Add --apply to reconcile missing migration records and add any missing pause columns.",
      "  The script only repairs the known-safe 0011/0013 drift for this repo.",
    ].join("\n"),
  );
}

async function readJournal(): Promise<Journal> {
  const contents = await readFile(JOURNAL_PATH, "utf8");
  return JSON.parse(contents) as Journal;
}

async function sha256File(filePath: string) {
  const contents = await readFile(filePath);
  return createHash("sha256").update(contents).digest("hex");
}

async function getAppliedMigrations(db: ReturnType<typeof createClient>) {
  const result = await db.execute<AppliedMigrationRow>(
    "select hash, created_at from __drizzle_migrations order by created_at, hash",
  );
  return result.rows;
}

async function getTableColumns(
  db: ReturnType<typeof createClient>,
  tableName: string,
) {
  const result = await db.execute<{
    name: string;
  }>(`pragma table_info(${tableName})`);
  return new Set(result.rows.map((row) => row.name));
}

async function getIndexNames(db: ReturnType<typeof createClient>) {
  const result = await db.execute<{ name: string }>(
    "select name from sqlite_master where type = 'index'",
  );
  return new Set(result.rows.map((row) => row.name));
}

async function getTableNames(db: ReturnType<typeof createClient>) {
  const result = await db.execute<{ name: string }>(
    "select name from sqlite_master where type = 'table'",
  );
  return new Set(result.rows.map((row) => row.name));
}

function printChecks(title: string, checks: RepairCheck[]) {
  console.log(`\n[repair-drizzle-migration-state] ${title}`);
  for (const check of checks) {
    const status = check.ok ? "OK" : "MISSING";
    console.log(`  - ${status}: ${check.name} (${check.details})`);
  }
}

function assertJournalEntry(
  journal: Journal,
  tag: string,
): JournalEntry {
  const entry = journal.entries.find((candidate) => candidate.tag === tag);

  if (!entry) {
    throw new Error(`Journal entry ${tag} was not found in ${JOURNAL_PATH}`);
  }

  return entry;
}

async function ensureMigrationRecorded(input: {
  db: ReturnType<typeof createClient>;
  appliedMigrations: Map<string, number | null>;
  fileName: string;
  journalEntry: JournalEntry;
  apply: boolean;
}) {
  const filePath = path.join(MIGRATIONS_DIR, input.fileName);
  const hash = await sha256File(filePath);
  const appliedCreatedAt = input.appliedMigrations.get(hash);

  if (appliedCreatedAt === input.journalEntry.when) {
    console.log(`  - OK: ${input.journalEntry.tag} already recorded with current hash ${hash}`);
    return hash;
  }

  if (appliedCreatedAt !== undefined && !input.apply) {
    console.log(
      `  - WOULD UPDATE: ${input.journalEntry.tag} created_at from ${appliedCreatedAt} to ${input.journalEntry.when}`,
    );
    return hash;
  }

  if (appliedCreatedAt === undefined && !input.apply) {
    console.log(
      `  - WOULD RECORD: ${input.journalEntry.tag} with hash ${hash} and created_at ${input.journalEntry.when}`,
    );
    return hash;
  }

  if (appliedCreatedAt !== undefined) {
    await input.db.execute({
      sql: "update __drizzle_migrations set created_at = ? where hash = ?",
      args: [input.journalEntry.when, hash],
    });
    input.appliedMigrations.set(hash, input.journalEntry.when);
    console.log(
      `  - UPDATED: ${input.journalEntry.tag} created_at ${appliedCreatedAt} -> ${input.journalEntry.when}`,
    );
    return hash;
  }

  await input.db.execute({
    sql: "insert into __drizzle_migrations(hash, created_at) values (?, ?)",
    args: [hash, input.journalEntry.when],
  });

  input.appliedMigrations.set(hash, input.journalEntry.when);
  console.log(`  - RECORDED: ${input.journalEntry.tag} (${hash})`);
  return hash;
}

async function repair0011(input: {
  db: ReturnType<typeof createClient>;
  appliedMigrations: Map<string, number | null>;
  journal: Journal;
  apply: boolean;
}) {
  const tableNames = await getTableNames(input.db);
  const gameColumns = await getTableColumns(input.db, "games");
  const indexNames = await getIndexNames(input.db);

  const checks: RepairCheck[] = [
    {
      name: "game_join_requests table",
      ok: tableNames.has("game_join_requests"),
      details: "created by 0011",
    },
    {
      name: "games.share_token column",
      ok: gameColumns.has("share_token"),
      details: "added by 0011",
    },
    {
      name: "games.invite_users_enabled column",
      ok: gameColumns.has("invite_users_enabled"),
      details: "added by 0011",
    },
    {
      name: "games_share_token_unique index",
      ok: indexNames.has("games_share_token_unique"),
      details: "created by 0011",
    },
  ];

  printChecks("0011_new_revanche schema audit", checks);

  if (checks.some((check) => !check.ok)) {
    throw new Error(
      "0011_new_revanche is only partially present in the target database. Aborting without changes.",
    );
  }

  await ensureMigrationRecorded({
    db: input.db,
    appliedMigrations: input.appliedMigrations,
    fileName: "0011_new_revanche.sql",
    journalEntry: assertJournalEntry(input.journal, "0011_new_revanche"),
    apply: input.apply,
  });
}

async function repair0013(input: {
  db: ReturnType<typeof createClient>;
  appliedMigrations: Map<string, number | null>;
  journal: Journal;
  apply: boolean;
}) {
  const gameColumns = await getTableColumns(input.db, "games");
  const missingColumns = [
    !gameColumns.has("paused_at") ? "paused_at" : null,
    !gameColumns.has("paused_next_user_id") ? "paused_next_user_id" : null,
  ].filter((value): value is string => value !== null);

  console.log("\n[repair-drizzle-migration-state] 0013_play_game_pause_state schema audit");
  if (missingColumns.length === 0) {
    console.log("  - OK: games.paused_at and games.paused_next_user_id are present");
  } else {
    for (const column of missingColumns) {
      console.log(`  - MISSING: games.${column}`);
    }
  }

  if (missingColumns.length > 0 && input.apply) {
    if (missingColumns.includes("paused_at")) {
      await input.db.execute("ALTER TABLE `games` ADD `paused_at` text");
      console.log("  - APPLIED: added games.paused_at");
    }

    if (missingColumns.includes("paused_next_user_id")) {
      await input.db.execute(
        "ALTER TABLE `games` ADD `paused_next_user_id` text REFERENCES `users`(`id`) ON DELETE set null",
      );
      console.log("  - APPLIED: added games.paused_next_user_id");
    }
  }

  if (missingColumns.length > 0 && !input.apply) {
    console.log("  - WOULD APPLY: missing 0013 columns");
  }

  const postRepairColumns = await getTableColumns(input.db, "games");
  if (
    !postRepairColumns.has("paused_at") ||
    !postRepairColumns.has("paused_next_user_id")
  ) {
    throw new Error(
      "0013_play_game_pause_state columns are still missing after repair check. Aborting.",
    );
  }

  await ensureMigrationRecorded({
    db: input.db,
    appliedMigrations: input.appliedMigrations,
    fileName: "0013_play_game_pause_state.sql",
    journalEntry: assertJournalEntry(input.journal, "0013_play_game_pause_state"),
    apply: input.apply,
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const env = validateEnv(true);

  const db = createClient({
    url: env.DATABASE_URL,
    ...("TURSO_AUTH_TOKEN" in env && env.TURSO_AUTH_TOKEN
      ? { authToken: env.TURSO_AUTH_TOKEN }
      : {}),
  });

  const journal = await readJournal();
  const appliedMigrationRows = await getAppliedMigrations(db);
  const appliedMigrations = new Map(
    appliedMigrationRows.map((row) => [row.hash, row.created_at] as const),
  );

  console.log(
    `[repair-drizzle-migration-state] Mode: ${options.apply ? "apply" : "dry-run"}`,
  );
  console.log(
    `[repair-drizzle-migration-state] Database: ${env.DATABASE_URL}`,
  );
  console.log(
    `[repair-drizzle-migration-state] Applied migration rows: ${appliedMigrationRows.length}`,
  );

  await repair0011({
    db,
    appliedMigrations,
    journal,
    apply: options.apply,
  });

  await repair0013({
    db,
    appliedMigrations,
    journal,
    apply: options.apply,
  });

  console.log(
    `\n[repair-drizzle-migration-state] ${options.apply ? "Repair complete" : "Dry run complete"}`,
  );
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? `[repair-drizzle-migration-state] ${error.message}`
      : error,
  );
  process.exit(1);
});
