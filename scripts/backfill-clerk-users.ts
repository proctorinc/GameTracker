import { createClerkClient } from "@clerk/backend";
import { and, eq, isNull } from "drizzle-orm";
import { db, users } from "../src/lib/db";
import { updateUser } from "../src/lib/db/store/user.store";

function requireEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to backfill Clerk users`);
  }

  return value;
}

async function findExistingClerkUser(input: {
  clerk: ReturnType<typeof createClerkClient>;
  localUserId: string;
  email: string | null;
  phoneNumber: string | null;
}) {
  const byExternalId = await input.clerk.users.getUserList({
    externalId: [input.localUserId],
    limit: 1,
  });
  if (byExternalId.data[0]) {
    return byExternalId.data[0];
  }

  if (input.email) {
    const byEmail = await input.clerk.users.getUserList({
      emailAddress: [input.email],
      limit: 1,
    });
    if (byEmail.data[0]) {
      return byEmail.data[0];
    }
  }

  if (input.phoneNumber) {
    const byPhone = await input.clerk.users.getUserList({
      phoneNumber: [input.phoneNumber],
      limit: 1,
    });
    if (byPhone.data[0]) {
      return byPhone.data[0];
    }
  }

  return null;
}

async function main() {
  const secretKey = requireEnv("CLERK_SECRET_KEY");
  const clerk = createClerkClient({ secretKey });
  const candidates = await db.query.users.findMany({
    where: and(isNull(users.clerkUserId), eq(users.isGuest, false), isNull(users.mergedIntoUserId)),
  });

  for (const candidate of candidates) {
    const existing = await findExistingClerkUser({
      clerk,
      localUserId: candidate.id,
      email: candidate.email,
      phoneNumber: candidate.phoneNumber,
    });

    const clerkUser =
      existing ??
      (await clerk.users.createUser({
        externalId: candidate.id,
        emailAddress: candidate.email ? [candidate.email] : undefined,
        phoneNumber: candidate.phoneNumber ? [candidate.phoneNumber] : undefined,
        firstName: candidate.firstName ?? undefined,
        lastName: candidate.lastName ?? undefined,
        skipLegalChecks: true,
      }));

    await updateUser(candidate.id, {
      clerkUserId: clerkUser.id,
      email:
        clerkUser.emailAddresses.find(
          (emailAddress) => emailAddress.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        candidate.email,
      phoneNumber:
        clerkUser.phoneNumbers.find(
          (phoneNumber) => phoneNumber.id === clerkUser.primaryPhoneNumberId,
        )?.phoneNumber ??
        clerkUser.phoneNumbers[0]?.phoneNumber ??
        candidate.phoneNumber,
      avatarUrl: clerkUser.imageUrl || candidate.avatarUrl,
    });

    console.log(`Backfilled ${candidate.id} -> ${clerkUser.id}`);
  }
}

void main();
