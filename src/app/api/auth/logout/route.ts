import { NextResponse } from "next/server";
import { getSessionTokenFromCookie, clearSessionCookie } from "@/lib/auth/cookies";
import { deleteSessionByToken } from "@/lib/auth/session-store";

export const POST = async (request: Request) => {
  try {
    // Read session cookie
    const token = getSessionTokenFromCookie(request);

    if (token) {
      // Delete DB session
      await deleteSessionByToken(token);
    }

    // Clear cookie
    const response = new NextResponse(null, {
      status: 204,
      headers: { "Content-Type": "" },
    });
    const clearedHeaders = await clearSessionCookie(request);
    if (clearedHeaders) {
      response.headers.set("set-cookie", clearedHeaders.headers.get("set-cookie") ?? "");
    }

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Even on error, clear cookie and return success for user experience
    const response = new NextResponse(null, {
      status: 204,
      headers: { "Content-Type": "" },
    });
    const clearedHeaders = await clearSessionCookie(request);
    if (clearedHeaders) {
      response.headers.set("set-cookie", clearedHeaders.headers.get("set-cookie") ?? "");
    }

    return response;
  }
};
