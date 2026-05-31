/**
 * Protected route for fetching the current user's lightweight friend network.
 */
import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth/require-auth";
import { loadAuthMeData } from "@/lib/auth/auth-me";
import { logError, logInfo, logWarn } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: Request) => {
  const path = new URL(request.url).pathname;
  try {
    const auth = await requireAuth(request);
    const authMe = await loadAuthMeData(auth.user);
    logInfo("dashboard.groups.succeeded", {
      path,
      userId: auth.user.id,
      sessionId: auth.sessionId,
      groupCount: authMe.network.length,
    });
    return NextResponse.json(authMe.network);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logWarn("dashboard.groups.rejected", {
        path,
        reason: error.message,
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    logError("dashboard.groups.failed", error, {
      path: new URL(request.url).pathname,
    });
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
