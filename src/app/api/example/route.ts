/**
 * Protected route template - all API routes should use this pattern
 */
import { withAuth } from "@/lib/auth/require-auth";
import { logInfo } from "@/lib/server-log";
import { getRequestContextFromRequest } from "@/lib/server-request-context";

export const GET = withAuth(async (request, auth) => {
  logInfo("example.route.succeeded", {
    ...getRequestContextFromRequest(request),
    userId: auth.user.id,
    sessionId: auth.sessionId,
  });
  return Response.json({ message: "You are authenticated!" });
});
