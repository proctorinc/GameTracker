import "server-only";

import type { User as ClerkBackendUser, UserJSON } from "@clerk/backend";
import {
  createUser,
  getUserByClerkUserId,
  getUserByEmail,
  type UserBase,
  updateUser,
} from "@/lib/db/store/user.store";

type ClerkUserPayload = ClerkBackendUser | UserJSON;

function normalizeEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

function getClerkUserId(user: ClerkUserPayload) {
  return user.id;
}

function getClerkUserFirstName(user: ClerkUserPayload) {
  return "firstName" in user ? user.firstName : user.first_name;
}

function getClerkUserLastName(user: ClerkUserPayload) {
  return "lastName" in user ? user.lastName : user.last_name;
}

function getClerkUserImageUrl(user: ClerkUserPayload) {
  return "imageUrl" in user ? user.imageUrl : user.image_url;
}

function getPrimaryEmail(user: ClerkUserPayload) {
  const primary =
    ("emailAddresses" in user ? user.emailAddresses : user.email_addresses).find(
      (emailAddress) =>
        emailAddress.id ===
        ("primaryEmailAddressId" in user
          ? user.primaryEmailAddressId
          : user.primary_email_address_id),
    ) ??
    ("emailAddresses" in user ? user.emailAddresses : user.email_addresses)[0];

  return normalizeEmail(
    primary && "emailAddress" in primary
      ? primary.emailAddress
      : primary?.email_address ?? null,
  );
}

function buildIdentityPatch(user: ClerkUserPayload, existing?: UserBase | null) {
  const firstName = getClerkUserFirstName(user)?.trim() || null;
  const lastName = getClerkUserLastName(user)?.trim() || null;

  return {
    clerkUserId: getClerkUserId(user),
    email: getPrimaryEmail(user),
    avatarUrl: getClerkUserImageUrl(user) || null,
    firstName: existing?.firstName ?? firstName,
    lastName: existing?.lastName ?? lastName,
  };
}

async function findExistingUserForClerkUser(
  user: ClerkUserPayload,
): Promise<UserBase | null> {
  const byClerkUserId = await getUserByClerkUserId(getClerkUserId(user));
  if (byClerkUserId) {
    return byClerkUserId;
  }

  const email = getPrimaryEmail(user);
  if (email) {
    const byEmail = await getUserByEmail(email);
    if (byEmail) {
      return byEmail;
    }
  }

  return null;
}

export async function upsertLocalUserFromClerkUser(
  user: ClerkUserPayload,
): Promise<UserBase> {
  const existing = await findExistingUserForClerkUser(user);
  const identityPatch = buildIdentityPatch(user, existing);

  if (!existing) {
    return createUser({
      ...identityPatch,
      color: "#FFFFFF",
      isGuest: false,
      isProfileComplete: false,
    });
  }

  const updated = await updateUser(existing.id, identityPatch);

  if (!updated) {
    throw new Error(
      `Failed to sync local user for Clerk user ${getClerkUserId(user)}`,
    );
  }

  return updated;
}

export async function clearLocalUserClerkIdentity(
  clerkUserId: string,
): Promise<UserBase | null> {
  const existing = await getUserByClerkUserId(clerkUserId);

  if (!existing) {
    return null;
  }

  return updateUser(existing.id, {
    clerkUserId: null,
    email: null,
    avatarUrl: null,
  });
}
