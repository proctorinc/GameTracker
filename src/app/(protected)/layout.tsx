import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionByToken, isValidSession } from "@/lib/auth/session-store";
import { DEFAULT_RETURN_PATH, sanitizeReturnPath } from "@/lib/auth/return-path";

function getSessionTokenFromCookieHeader(cookieHeader: string): string | null {
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("skyjo_session="));

  if (!match) {
    return null;
  }

  return match.slice("skyjo_session=".length) || null;
}

function redirectToLogin(from: string): never {
  const params = new URLSearchParams({ from });
  redirect(`/login?${params.toString()}`);
}

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerStore = await headers();
  const from = sanitizeReturnPath(
    headerStore.get("x-return-path") ?? DEFAULT_RETURN_PATH,
  );
  const cookieHeader = headerStore.get("cookie") ?? "";
  const sessionToken = getSessionTokenFromCookieHeader(cookieHeader);

  if (!sessionToken) {
    redirectToLogin(from);
  }

  const session = await getSessionByToken(sessionToken);

  if (!session || !isValidSession(session)) {
    redirectToLogin(from);
  }

  return <>{children}</>;
}
