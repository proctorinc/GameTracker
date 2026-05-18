import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAuth, UnauthorizedError } from "@/lib/auth/require-auth";
import type { AuthUser } from "@/lib/auth/session";
import { getGroupById, getReferralNetwork, getPendingReferralsForGroup } from "@/lib/db/group-store";

export const GET = async (request: NextRequest) => {
  try {
    const auth = await requireAuth(request);

    // Only support users with a group (self-registered users get one on signup)
    if (!auth.user.group_id) {
      return NextResponse.json({ error: "group_not_found" }, { status: 404 });
    }

    const group = await getGroupById(auth.user.group_id);

    if (!group) {
      return NextResponse.json({ error: "group_not_found" }, { status: 404 });
    }

    const [network, pendingReferrals] = await Promise.all([
      getReferralNetwork(auth.user.group_id!),
      getPendingReferralsForGroup(auth.user.group_id!),
    ]);

    return NextResponse.json({
      user: auth.user,
      group,
      network,
      pending_referrals: pendingReferrals,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "internal_server_error" }, { status: 500 });
  }
};
