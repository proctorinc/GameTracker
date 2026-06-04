import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth/require-auth";
import { loadAuthMeData } from "@/lib/auth/auth-me";
import { logError, logInfo, logWarn } from "@/lib/server-log";
import { getRequestContextFromRequest } from "@/lib/server-request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  const requestContext = getRequestContextFromRequest(request);
  try {
    const auth = await requireAuth(request);
    const authMe = await loadAuthMeData(auth.user);
    logInfo("auth.me.succeeded", {
      ...requestContext,
      userId: auth.user.id,
      authSessionId: auth.sessionId,
      networkSize: authMe.network.length,
    });
    return NextResponse.json(authMe);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      logWarn("auth.me.rejected", {
        ...requestContext,
        reason: error.message,
      });
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    logError("auth.me.failed", error, {
      ...requestContext,
    });
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
