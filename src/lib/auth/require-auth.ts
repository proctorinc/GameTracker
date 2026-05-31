import type { AuthUser } from "./session";
import { UnauthorizedError } from "./session";
import { getSessionTokenFromCookie } from "./cookies";
import { isValidSession } from "./protected-session";
import { getSessionByTokenHash } from "../db/store/session.store";
import { hashTokenWithSecret } from "./tokens";
import { logError, logInfo, logWarn } from "../server-log";
import { getRequestContextFromRequest } from "../server-request-context";

export async function requireAuth(
  request: Request,
): Promise<{ user: AuthUser; sessionId: string }> {
  const requestContext = getRequestContextFromRequest(request);
  const token = getSessionTokenFromCookie(request);

  if (!token) {
    logWarn("auth.require.rejected", {
      ...requestContext,
      reason: "missing_session_cookie",
    });
    throw new UnauthorizedError("No session cookie found");
  }

  const session = await getSessionByTokenHash(hashTokenWithSecret(token));

  if (!session) {
    logWarn("auth.require.rejected", {
      ...requestContext,
      reason: "invalid_or_expired_session",
    });
    throw new UnauthorizedError("Invalid or expired session");
  }

  if (!isValidSession(session)) {
    logWarn("auth.require.rejected", {
      ...requestContext,
      reason: "expired_session",
      sessionId: session.id,
      userId: session.user.id,
    });
    throw new UnauthorizedError("Session has expired");
  }

  logInfo("auth.require.succeeded", {
    ...requestContext,
    sessionId: session.id,
    userId: session.user.id,
  });
  return { user: session.user, sessionId: session.id };
}

export function withAuth(
  handler: (req: Request, ctx: { user: AuthUser; sessionId: string }) => Promise<Response>,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      const auth = await requireAuth(req);
      return handler(req, auth);
    } catch (error) {
      if (!(error instanceof UnauthorizedError)) {
        logError("auth.with_auth.failed", error, {
          ...getRequestContextFromRequest(req),
        });
      }
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  };
}

export { UnauthorizedError };
