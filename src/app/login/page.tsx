import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import {
  DEFAULT_RETURN_PATH,
  sanitizeReturnPath,
} from "@/lib/auth/return-path";
import { getSessionByTokenHash } from "@/lib/db/store/session.store";
import { getUserById } from "@/lib/db/store/user.store";
import { isValidSession } from "@/lib/auth/protected-session";
import { hashTokenWithSecret } from "@/lib/auth/tokens";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ from }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const sessionToken = cookieStore.get("app_session")?.value;
  const target = sanitizeReturnPath(from ?? DEFAULT_RETURN_PATH);

  if (sessionToken) {
    const session = await getSessionByTokenHash(hashTokenWithSecret(sessionToken));

    if (session && isValidSession(session)) {
      // Load user data without relations to avoid "referencedTable" errors
      const userData = await getUserById(session.user.id);

      if (!userData) {
        // User no longer exists or is deleted, invalidate session
        redirect(`/login?from=${encodeURIComponent(target)}#user-deleted`);
      }

      redirect(target);
    }
  }

  return <LoginForm />;
}
