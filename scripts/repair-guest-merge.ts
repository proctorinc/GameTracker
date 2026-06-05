import { validateEnv } from "../src/lib/env-config";
import {
  getGuestMergeReferenceReport,
  getUserById,
  mergeGuestUserIntoUser,
  updateUser,
  type GuestMergeReferenceReport,
} from "../src/lib/db/store/user.store";

type CliOptions = {
  guestUserId: string;
  recipientUserId: string | null;
  inviterUserId: string | null;
  apply: boolean;
};

function parseArgs(argv: string[]): CliOptions {
  let guestUserId = "";
  let recipientUserId: string | null = null;
  let inviterUserId: string | null = null;
  let apply = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--guest" || arg === "--guest-user-id") {
      guestUserId = argv[index + 1] ?? "";
      index += 1;
      continue;
    }

    if (arg === "--recipient" || arg === "--recipient-user-id") {
      recipientUserId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--inviter" || arg === "--inviter-user-id") {
      inviterUserId = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (arg === "--apply") {
      apply = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }
  }

  if (!guestUserId) {
    throw new Error("Missing required --guest <guestUserId>");
  }

  return {
    guestUserId,
    recipientUserId,
    inviterUserId,
    apply,
  };
}

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node --import tsx scripts/repair-guest-merge.ts --guest <guestUserId> [--recipient <userId>] [--inviter <userId>] [--apply]",
      "",
      "Behavior:",
      "  Dry run is the default and only prints current references.",
      "  Add --apply to re-run the merge cleanup and print before/after counts.",
      "  If --recipient is omitted, the script uses guest.merged_into_user_id.",
      "  If --inviter is omitted, the script uses guest.created_by_user_id.",
    ].join("\n"),
  );
}

function referenceTotal(report: GuestMergeReferenceReport["guestReferences"]) {
  return Object.values(report).reduce((sum, count) => sum + count, 0);
}

function printReport(label: string, report: GuestMergeReferenceReport) {
  console.log(`\n[repair-guest-merge] ${label}`);
  console.log(
    JSON.stringify(
      {
        guestUserId: report.guestUserId,
        recipientUserId: report.recipientUserId,
        guest: report.guest
          ? {
              id: report.guest.id,
              isGuest: report.guest.isGuest,
              mergedIntoUserId: report.guest.mergedIntoUserId,
              created_by_user_id: report.guest.created_by_user_id,
            }
          : null,
        recipient: report.recipient
          ? {
              id: report.recipient.id,
              isGuest: report.recipient.isGuest,
            }
          : null,
        guestReferenceTotal: referenceTotal(report.guestReferences),
        guestReferences: report.guestReferences,
        recipientReferences: report.recipientReferences,
      },
      null,
      2,
    ),
  );
}

async function main() {
  validateEnv(true);
  const options = parseArgs(process.argv.slice(2));

  const guest = await getUserById(options.guestUserId);

  if (!guest) {
    throw new Error(`Guest user ${options.guestUserId} was not found`);
  }

  const recipientUserId = options.recipientUserId ?? guest.mergedIntoUserId ?? null;
  const inviterUserId = options.inviterUserId ?? guest.created_by_user_id ?? null;

  if (!recipientUserId) {
    throw new Error(
      "Could not determine recipient user. Pass --recipient <userId>.",
    );
  }

  if (!inviterUserId) {
    throw new Error(
      "Could not determine inviter user. Pass --inviter <userId>.",
    );
  }

  const recipient = await getUserById(recipientUserId);

  if (!recipient) {
    throw new Error(`Recipient user ${recipientUserId} was not found`);
  }

  const before = await getGuestMergeReferenceReport({
    guestUserId: guest.id,
    recipientUserId,
  });
  printReport("Before", before);

  if (!options.apply) {
    console.log(
      "\n[repair-guest-merge] Dry run only. Re-run with --apply to execute the cleanup.",
    );
    return;
  }

  if (!guest.isGuest) {
    throw new Error("The provided guest user is not marked as a guest");
  }

  // If a previous merge already marked the guest, temporarily reopen it so the
  // cleanup can re-run the merge logic against any leftover references.
  if (guest.mergedIntoUserId === recipientUserId) {
    await updateUser(guest.id, {
      mergedIntoUserId: null,
      mergedAt: null,
    });
  }

  const mergeResult = await mergeGuestUserIntoUser({
    guestUserId: guest.id,
    recipientUserId,
    inviterUserId,
  });

  const after = await getGuestMergeReferenceReport({
    guestUserId: guest.id,
    recipientUserId,
  });

  console.log("\n[repair-guest-merge] Applied cleanup");
  console.log(JSON.stringify(mergeResult, null, 2));
  printReport("After", after);
}

main().catch((error) => {
  console.error(
    error instanceof Error ? `[repair-guest-merge] ${error.message}` : error,
  );
  process.exit(1);
});
