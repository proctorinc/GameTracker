import { NextResponse } from "next/server";
import { logInfo } from "@/lib/server-log";
import { getRequestContextFromRequest } from "@/lib/server-request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = async (request: Request) => {
  logInfo("auth.logout.succeeded", {
    ...getRequestContextFromRequest(request),
    handledBy: "clerk_client",
  });

  return new NextResponse(null, {
    status: 204,
    headers: { "Content-Type": "" },
  });
};
