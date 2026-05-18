import type { AuthUser } from "./session";
import { getSessionByToken, isValidSession, type SessionData } from "./session-store";

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
}

/** Get session token from request cookie */
export function getSessionTokenFromCookie(request: Request): string | null {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    // Parse only the first cookie value for skyjo_session
    const match = cookieHeader.split(";").find((c) => c.trim().startsWith("skyjo_session="));
    if (match) {
      const token = match.replace(/^skyjo_session=/, "");
      return token;
    }
  } catch {
    // Ignore parsing errors
  }
  return null;
}

/** Check if session cookie exists */
export function hasSessionCookie(request: Request): boolean {
  const token = getSessionTokenFromCookie(request);
  return !!token;
}

/** Set session cookie with HTTP-only, Secure (prod), SameSite=Lax flags */
export function setSessionCookie(
  request: Request,
  value: string,
  maxAgeSeconds: number = 60 * 60 * 24 * 400, // ~400 days
): Response {
  try {
    const headers = new Headers();
    if (request.headers.get("cookie")) {
      // Remove all skyjo_session cookies before setting a new one
      headers.set(
        "set-cookie",
        request.headers.get("cookie")!.split(";").filter((c) => !c.startsWith("skyjo_session=")).join(";"),
      );
    }

    const name = "skyjo_session";
    const path = "/";
    const sameSite = "lax";
    const secure = request.headers.get("x-forwarded-proto") === "https" || process.env.NODE_ENV === "production";

    headers.append(
      "set-cookie",
      `${name}=${value}; Max-Age=${maxAgeSeconds}; Path=${path}; SameSite=${sameSite}; ${secure ? "Secure;" : ""}`,
    );

    return new Response(null, { status: 200, headers });
  } catch {
    // If cookies() API not available or fails, just return empty response
    return new Response(null, { status: 200 });
  }
}

/** Validate session and extract user (returns null if invalid) */
export async function validateSession(
  request: Request,
): Promise<{ validated: false } | { validated: true; user: AuthUser; sessionId: string }> {
  const token = getSessionTokenFromCookie(request);
  if (!token) {
    return { validated: false };
  }

  const session = await getSessionByToken(token);

  if (session && isValidSession(session)) {
    return { validated: true, user: session.user, sessionId: session.id };
  }

  return { validated: false };
}

/** Clear session cookie */
export function clearSessionCookie(request: Request): Response {
  try {
    const headers = new Headers();
    if (request.headers.get("cookie")) {
      // Remove all skyjo_session cookies
      headers.set(
        "set-cookie",
        request.headers.get("cookie")!.split(";").filter((c) => !c.startsWith("skyjo_session=")).join(";"),
      );
    }

    const name = "skyjo_session";
    const path = "/";
    const sameSite = "lax";
    headers.append(
      "set-cookie",
      `${name}=${""}; Max-Age=0; Path=${path}; SameSite=${sameSite}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""}`,
    );

    return new Response(null, { status: 204, headers });
  } catch {
    // If cookies() API not available or fails, just clear via redirect
    window.location.href = "/logout";
    return null as any;
  }
}

export async function requireAuth(
  request: Request,
): Promise<{ user: AuthUser; sessionId: string }> {
  const token = getSessionTokenFromCookie(request);

  if (!token) {
    throw new Error("No session cookie found");
  }

  const session = await getSessionByToken(token);

  if (!session) {
    throw new Error("Invalid or expired session");
  }

  if (!isValidSession(session)) {
    throw new Error("Session has expired");
  }

  return { user: session.user, sessionId: session.id };
}
