/**
 * Protected route for fetching the current user's lightweight friend network.
 */
import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth/require-auth";
import { loadAuthMeData } from "@/lib/auth/auth-me";

export const GET = async (request: Request) => {
  try {
    const auth = await requireAuth(request);
    const authMe = await loadAuthMeData(auth.user);
    return NextResponse.json(authMe.network);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("Dashboard groups error:", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
