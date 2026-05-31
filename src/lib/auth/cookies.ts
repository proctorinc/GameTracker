import { getSessionByTokenHash } from "../db/store/session.store";
import { getUserById } from "../db/store/user.store";
import { hashTokenWithSecret } from "./tokens";
import { isValidSession } from "./protected-session";
import type { AuthUser } from "./session";
import { logInfo, logWarn } from "../server-log";
import { getRequestContextFromRequest } from "../server-request-context";

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
}

/** Get session token from request cookie */
export function getSessionTokenFromCookie(request: Request): string | null {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    // Parse only the first cookie value for app_session
    const match = cookieHeader
      .split(";")
      .find((c) => c.trim().startsWith("app_session="));
    if (match) {
      const token = match.replace(/^app_session=/, "");
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
      // Remove all app_session cookies before setting a new one
      headers.set(
        "set-cookie",
        request.headers
          .get("cookie")!
          .split(";")
          .filter((c) => !c.startsWith("app_session="))
          .join(";"),
      );
    }

    const name = "app_session";
    const path = "/";
    const sameSite = "lax";
    const secure =
      request.headers.get("x-forwarded-proto") === "https" ||
      process.env.NODE_ENV === "production";

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

/** Get session and user from request cookie */
export async function validateSession(
  request: Request,
): Promise<
  { validated: false } | { validated: true; user: AuthUser; sessionId: string }
> {
  const requestContext = getRequestContextFromRequest(request);
  const token = getSessionTokenFromCookie(request);
  if (!token) {
    logInfo("auth.session_validation.missing", {
      ...requestContext,
      reason: "missing_session_cookie",
    });
    return { validated: false };
  }

  const session = await getSessionByTokenHash(hashTokenWithSecret(token));

  if (!session || !isValidSession(session)) {
    logWarn("auth.session_validation.rejected", {
      ...requestContext,
      reason: !session ? "invalid_session" : "expired_session",
      sessionId: session?.id ?? null,
      userId: session?.user.id ?? null,
    });
    return { validated: false };
  }

  // Load user data separately to avoid "referencedTable" errors from relation loading
  const userData = await getUserById(session.user.id);

  if (!userData) {
    // User no longer exists - invalidate session
    logWarn("auth.session_validation.rejected", {
      ...requestContext,
      reason: "missing_user_record",
      sessionId: session.id,
      userId: session.user.id,
    });
    return { validated: false };
  }

  logInfo("auth.session_validation.succeeded", {
    ...requestContext,
    sessionId: session.id,
    userId: userData.id,
  });
  return { validated: true, user: userData, sessionId: session.id };
}

export function clearSessionCookie(request: Request): Response {
  try {
    const headers = new Headers();
    if (request.headers.get("cookie")) {
      // Remove all app_session cookies
      headers.set(
        "set-cookie",
        request.headers
          .get("cookie")!
          .split(";")
          .filter((c) => !c.startsWith("app_session="))
          .join(";"),
      );
    }

    const name = "app_session";
    const path = "/";
    const sameSite = "lax";
    headers.append(
      "set-cookie",
      `${name}=${""}; Max-Age=0; Path=${path}; SameSite=${sameSite}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""}`,
    );

    return new Response(null, { status: 204, headers });
  } catch {
    // Fall back to a best-effort cookie clear response in non-browser contexts.
    return new Response(null, { status: 204 });
  }
}

export async function requireAuth(
  request: Request,
): Promise<{ user: AuthUser; sessionId: string }> {
  const requestContext = getRequestContextFromRequest(request);
  const token = getSessionTokenFromCookie(request);

  if (!token) {
    logWarn("auth.cookies_require.rejected", {
      ...requestContext,
      reason: "missing_session_cookie",
    });
    throw new Error("No session cookie found");
  }

  const session = await getSessionByTokenHash(hashTokenWithSecret(token));

  if (!session) {
    logWarn("auth.cookies_require.rejected", {
      ...requestContext,
      reason: "invalid_session",
    });
    throw new Error("Invalid or expired session");
  }

  if (!isValidSession(session)) {
    logWarn("auth.cookies_require.rejected", {
      ...requestContext,
      reason: "expired_session",
      sessionId: session.id,
      userId: session.user.id,
    });
    throw new Error("Session has expired");
  }

  // Load user data separately to avoid "referencedTable" errors from relation loading
  const userData = await getUserById(session.user.id);

  if (!userData) {
    logWarn("auth.cookies_require.rejected", {
      ...requestContext,
      reason: "missing_user_record",
      sessionId: session.id,
      userId: session.user.id,
    });
    throw new Error("User account no longer exists");
  }

  logInfo("auth.cookies_require.succeeded", {
    ...requestContext,
    sessionId: session.id,
    userId: userData.id,
  });
  return { user: userData, sessionId: session.id };
}
