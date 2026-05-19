import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";
import { DEFAULT_RETURN_PATH, sanitizeReturnPath } from "@/lib/auth/return-path";
import { getSessionByToken, isValidSession } from "@/lib/auth/session-store";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ from }, cookieStore] = await Promise.all([searchParams, cookies()]);
  const sessionToken = cookieStore.get("skyjo_session")?.value;
  const target = sanitizeReturnPath(from ?? DEFAULT_RETURN_PATH);

  if (sessionToken) {
    const session = await getSessionByToken(sessionToken);

    if (session && isValidSession(session)) {
      redirect(target);
    }
  }

  return <LoginForm />;
}
