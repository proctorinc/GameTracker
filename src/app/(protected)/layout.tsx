import { countIncomingPendingInvitationsForUser } from "@/lib/db/store";
import { listUnseenAnnouncementsForUser } from "@/lib/db/store/announcement.store";
import { loadCurrentUser } from "@/lib/auth/auth-me";
import { ProtectedLayoutShell } from "./protected-layout-shell";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await loadCurrentUser({
    onMissingAuth: "redirect",
  });
  const [pendingInvitationCount, announcements] = await Promise.all([
    countIncomingPendingInvitationsForUser({ userId: user.id }),
    listUnseenAnnouncementsForUser({
      userId: user.id,
      userCreatedAt: user.createdAt,
      isGuest: user.isGuest,
      mergedIntoUserId: user.mergedIntoUserId,
    }),
  ]);

  return (
    <ProtectedLayoutShell
      hasPendingFriendInvitations={pendingInvitationCount > 0}
      announcements={announcements}
    >
      {children}
    </ProtectedLayoutShell>
  );
}
