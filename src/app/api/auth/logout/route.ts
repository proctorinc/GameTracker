import { NextResponse } from "next/server";
import {
  getSessionTokenFromCookie,
  clearSessionCookie,
} from "@/lib/auth/cookies";
import { deleteSessionByToken } from "@/lib/db/store/session.store";
import { hashTokenWithSecret } from "@/lib/auth/tokens";
import { logError, logInfo } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = async (request: Request) => {
  const path = new URL(request.url).pathname;
  try {
    // Read session cookie
    const token = getSessionTokenFromCookie(request);
    let deletedSession = false;

    if (token) {
      // Delete DB session
      await deleteSessionByToken(hashTokenWithSecret(token));
      deletedSession = true;
    }

    // Clear cookie
    const response = new NextResponse(null, {
      status: 204,
      headers: { "Content-Type": "" },
    });
    const clearedHeaders = await clearSessionCookie(request);
    if (clearedHeaders) {
      response.headers.set(
        "set-cookie",
        clearedHeaders.headers.get("set-cookie") ?? "",
      );
    }

    logInfo("auth.logout.succeeded", {
      path,
      hadSessionCookie: Boolean(token),
      deletedSession,
    });

    return response;
  } catch (error) {
    logError("auth.logout.failed", error, {
      path,
    });
    // Even on error, clear cookie and return success for user experience
    const response = new NextResponse(null, {
      status: 204,
      headers: { "Content-Type": "" },
    });
    const clearedHeaders = await clearSessionCookie(request);
    if (clearedHeaders) {
      response.headers.set(
        "set-cookie",
        clearedHeaders.headers.get("set-cookie") ?? "",
      );
    }

    return response;
  }
};
