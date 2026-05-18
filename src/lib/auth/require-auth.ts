import type { AuthUser } from "./session";
import { UnauthorizedError } from "./session";
import { getSessionTokenFromCookie, validateSession } from "./cookies";
import { getSessionByToken, isValidSession } from "./session-store";

export async function requireAuth(
  request: Request,
): Promise<{ user: AuthUser; sessionId: string }> {
  const token = getSessionTokenFromCookie(request);

  if (!token) {
    throw new UnauthorizedError("No session cookie found");
  }

  const session = await getSessionByToken(token);

  if (!session) {
    throw new UnauthorizedError("Invalid or expired session");
  }

  if (!isValidSession(session)) {
    throw new UnauthorizedError("Session has expired");
  }

  return { user: session.user, sessionId: session.id };
}

export async function withAuth(
  handler: (req: Request, ctx: { user: AuthUser; sessionId: string }) => Promise<Response>,
): Promise<(req: Request) => Promise<Response>> {
  return async (req: Request) => {
    try {
      const auth = await requireAuth(req);
      return handler(req, auth);
    } catch {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  };
}

export { UnauthorizedError };
