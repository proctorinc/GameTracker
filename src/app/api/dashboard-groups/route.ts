/**
 * Protected route for fetching referral network data for the dashboard.
 * Uses existing getReferralNetwork() function from group-store.ts.
 */
import { NextResponse } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth/require-auth";
import { getReferralNetwork } from "@/lib/db/group-store";

export const GET = async (request: Request) => {
  try {
    const auth = await requireAuth(request);

    // Only support users with a group
    if (!auth.user.group_id) {
      return NextResponse.json({ error: "group_not_found" }, { status: 404 });
    }

    const network = await getReferralNetwork(auth.user.group_id!);

    return NextResponse.json(network);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("Dashboard groups error:", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
