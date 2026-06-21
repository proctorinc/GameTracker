import { countIncomingPendingInvitationsForUser } from "@/lib/db/store";
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
  const pendingInvitationCount = await countIncomingPendingInvitationsForUser({
    userId: user.id,
  });

  return (
    <ProtectedLayoutShell
      hasPendingFriendInvitations={pendingInvitationCount > 0}
    >
      {children}
    </ProtectedLayoutShell>
  );
}
