import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileOverview } from "@/components/profile/profile-overview";
import { loadAuthMeData } from "@/lib/auth/auth-me";
import { getSessionByToken, isValidSession } from "@/lib/auth/session-store";
import { DEFAULT_RETURN_PATH } from "@/lib/auth/return-path";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("skyjo_session")?.value;

  if (!sessionToken) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const session = await getSessionByToken(sessionToken);

  if (!session || !isValidSession(session)) {
    redirect(`/login?from=${encodeURIComponent(DEFAULT_RETURN_PATH)}`);
  }

  const { user, group, network, pending_referrals } = await loadAuthMeData(session.user);

  return (
    <ProfileOverview
      user={user}
      group={group}
      network={network}
      pendingReferrals={pending_referrals}
    />
  );
}
