import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth/require-auth";
import { loadAuthMeData } from "@/lib/auth/auth-me";
import { logError } from "@/lib/server-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  try {
    const auth = await requireAuth(request);
    return NextResponse.json(await loadAuthMeData(auth.user));
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    logError("auth.me.failed", error, {
      path: request.nextUrl.pathname,
    });
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
