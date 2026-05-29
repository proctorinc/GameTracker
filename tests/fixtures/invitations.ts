export async function createInvitationFixture(input: {
  inviterUserId: string;
  inviteePhoneNumber?: string;
  inviteeUserId?: string;
  targetType: "phone" | "user" | "link";
}) {
  const { createInvitation } = await import("../../src/lib/db/store/invitation.store");

  return createInvitation({
    inviterUserId: input.inviterUserId,
    inviteePhoneNumber: input.inviteePhoneNumber ?? null,
    inviteeUserId: input.inviteeUserId ?? null,
    inviteToken: input.targetType === "link" ? "fixture-link-token" : null,
    targetType: input.targetType,
    kind: "friend",
    status: "pending",
  });
}
