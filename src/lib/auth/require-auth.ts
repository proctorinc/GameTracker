import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import type { AuthUser } from "./session";
import { UnauthorizedError } from "./session";
import { upsertLocalUserFromClerkUser } from "./clerk-user";
import { logError, logInfo, logWarn } from "../server-log";
import { getRequestContextFromRequest } from "../server-request-context";

export async function requireAuth(
  request: Request,
): Promise<{ user: AuthUser; sessionId: string }> {
  const requestContext = getRequestContextFromRequest(request);
  const { userId, sessionId: clerkSessionId } = await auth();

  if (!userId) {
    logWarn("auth.require.rejected", {
      ...requestContext,
      reason: "missing_clerk_user",
    });
    throw new UnauthorizedError("No authenticated Clerk user found");
  }

  const backendUser =
    (await currentUser()) ??
    (await (await clerkClient()).users.getUser(userId));

  if (!backendUser) {
    logWarn("auth.require.rejected", {
      ...requestContext,
      reason: "missing_clerk_backend_user",
      clerkUserId: userId,
    });
    throw new UnauthorizedError("Authenticated Clerk user could not be loaded");
  }

  const localUser = await upsertLocalUserFromClerkUser(backendUser);
  const sessionId = clerkSessionId ?? `clerk:${userId}`;

  logInfo("auth.require.succeeded", {
    ...requestContext,
    sessionId,
    clerkUserId: backendUser.id,
    userId: localUser.id,
  });
  return { user: localUser, sessionId };
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
