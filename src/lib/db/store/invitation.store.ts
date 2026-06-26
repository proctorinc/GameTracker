import { and, count, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db, invitations } from "../index";

export type InvitationBase = typeof invitations.$inferSelect;
export type InvitationInsert = typeof invitations.$inferInsert;
export type InvitationUpdate = Partial<Omit<InvitationInsert, "id">>;
export type InvitationFull = InvitationBase & {
  inviter: typeof db._.fullSchema.users.$inferSelect;
  invitee: typeof db._.fullSchema.users.$inferSelect | null;
  guestUser: typeof db._.fullSchema.users.$inferSelect | null;
  acceptedBy: typeof db._.fullSchema.users.$inferSelect | null;
};

function nowIso() {
  return new Date().toISOString();
}

export async function createInvitation(
  input: InvitationInsert,
): Promise<InvitationBase> {
  const [invitation] = await db
    .insert(invitations)
    .values({
      ...input,
      createdAt: input.createdAt ?? nowIso(),
      updatedAt: input.updatedAt ?? nowIso(),
    })
    .returning();

  return invitation;
}

export async function getInvitationById(
  id: string,
): Promise<InvitationBase | null> {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.id, id),
  });

  return invitation ?? null;
}

export async function getInvitationFullById(
  id: string,
): Promise<InvitationFull | null> {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.id, id),
    with: {
      inviter: true,
      invitee: true,
      guestUser: true,
      acceptedBy: true,
    },
  });

  return invitation ?? null;
}

export async function getInvitationByToken(
  inviteToken: string,
): Promise<InvitationBase | null> {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.inviteToken, inviteToken),
  });

  return invitation ?? null;
}

export async function getInvitationFullByToken(
  inviteToken: string,
): Promise<InvitationFull | null> {
  const invitation = await db.query.invitations.findFirst({
    where: eq(invitations.inviteToken, inviteToken),
    with: {
      inviter: true,
      invitee: true,
      guestUser: true,
      acceptedBy: true,
    },
  });

  return invitation ?? null;
}

export async function listOutgoingInvitationsForUser(
  userId: string,
): Promise<InvitationFull[]> {
  return db.query.invitations.findMany({
    where: and(
      eq(invitations.inviterUserId, userId),
      eq(invitations.status, "pending"),
    ),
    orderBy: [desc(invitations.createdAt)],
    with: {
      inviter: true,
      invitee: true,
      guestUser: true,
      acceptedBy: true,
    },
  });
}

export async function listIncomingInvitationsForUser(input: {
  userId: string;
}): Promise<InvitationFull[]> {
  const predicates = [
    and(
      eq(invitations.status, "pending"),
      eq(invitations.targetType, "user"),
      eq(invitations.inviteeUserId, input.userId),
    ),
    and(
      eq(invitations.status, "pending"),
      eq(invitations.targetType, "link"),
      eq(invitations.inviteeUserId, input.userId),
    ),
  ];
  return db.query.invitations.findMany({
    where: or(...predicates),
    orderBy: [desc(invitations.createdAt)],
    with: {
      inviter: true,
      invitee: true,
      guestUser: true,
      acceptedBy: true,
    },
  });
}

export async function countIncomingPendingInvitationsForUser(input: {
  userId: string;
}): Promise<number> {
  const predicates = [
    and(
      eq(invitations.status, "pending"),
      eq(invitations.targetType, "user"),
      eq(invitations.inviteeUserId, input.userId),
    ),
    and(
      eq(invitations.status, "pending"),
      eq(invitations.targetType, "link"),
      eq(invitations.inviteeUserId, input.userId),
    ),
  ];
  const [result] = await db
    .select({ count: count() })
    .from(invitations)
    .where(or(...predicates));

  return result?.count ?? 0;
}

export async function listPendingInvitationsForGuest(
  guestUserId: string,
): Promise<InvitationFull[]> {
  return db.query.invitations.findMany({
    where: and(
      eq(invitations.guestUserId, guestUserId),
      eq(invitations.status, "pending"),
    ),
    orderBy: [desc(invitations.createdAt)],
    with: {
      inviter: true,
      invitee: true,
      guestUser: true,
      acceptedBy: true,
    },
  });
}

export async function findPendingInvitationForUserTarget(input: {
  inviterUserId: string;
  inviteeUserId: string;
  guestUserId?: string | null;
}): Promise<InvitationBase | null> {
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.inviterUserId, input.inviterUserId),
      eq(invitations.targetType, "user"),
      eq(invitations.inviteeUserId, input.inviteeUserId),
      eq(invitations.status, "pending"),
      input.guestUserId
        ? eq(invitations.guestUserId, input.guestUserId)
        : isNull(invitations.guestUserId),
    ),
  });

  return invitation ?? null;
}

export async function findPendingInvitationForLinkTarget(input: {
  inviterUserId: string;
  guestUserId?: string | null;
  kind?: "friend" | "claim_guest";
}): Promise<InvitationBase | null> {
  const invitation = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.inviterUserId, input.inviterUserId),
      eq(invitations.targetType, "link"),
      eq(invitations.status, "pending"),
      eq(
        invitations.kind,
        input.kind ?? (input.guestUserId ? "claim_guest" : "friend"),
      ),
      input.guestUserId
        ? eq(invitations.guestUserId, input.guestUserId)
        : isNull(invitations.guestUserId),
    ),
  });

  return invitation ?? null;
}

export async function updateInvitation(
  id: string,
  input: InvitationUpdate,
): Promise<InvitationBase | null> {
  const [invitation] = await db
    .update(invitations)
    .set({
      ...input,
      updatedAt: nowIso(),
    })
    .where(eq(invitations.id, id))
    .returning();

  return invitation ?? null;
}

export async function updateInvitationsByIds(
  ids: string[],
  input: InvitationUpdate,
): Promise<number> {
  if (ids.length === 0) {
    return 0;
  }

  const result = await db
    .update(invitations)
    .set({
      ...input,
      updatedAt: nowIso(),
    })
    .where(inArray(invitations.id, ids));

  return result.rowsAffected ?? 0;
}

export async function revokePendingInvitationsForGuest(
  guestUserId: string,
  keepInvitationId?: string,
): Promise<number> {
  const pending = await db.query.invitations.findMany({
    where: and(
      eq(invitations.guestUserId, guestUserId),
      eq(invitations.status, "pending"),
    ),
    columns: {
      id: true,
    },
  });

  const ids = pending
    .map((invitation) => invitation.id)
    .filter((id) => id !== keepInvitationId);

  return updateInvitationsByIds(ids, {
    status: "revoked",
  });
}
