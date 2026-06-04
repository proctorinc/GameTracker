import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { NextRequest } from "next/server";
import { clearLocalUserClerkIdentity, upsertLocalUserFromClerkUser } from "@/lib/auth/clerk-user";
import { getClerkWebhookSigningSecret } from "@/lib/env-config";
import { logError, logInfo, logWarn } from "@/lib/server-log";
import { getRequestContextFromRequest } from "@/lib/server-request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const requestContext = getRequestContextFromRequest(request);

  try {
    getClerkWebhookSigningSecret();
    const event = await verifyWebhook(request);

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        const localUser = await upsertLocalUserFromClerkUser(event.data);
        logInfo("auth.clerk_webhook.succeeded", {
          ...requestContext,
          webhookType: event.type,
          clerkUserId: event.data.id,
          userId: localUser.id,
        });
        break;
      }
      case "user.deleted": {
        const deletedUserId =
          event.data && "id" in event.data ? event.data.id : null;

        if (deletedUserId) {
          await clearLocalUserClerkIdentity(deletedUserId);
        }

        logInfo("auth.clerk_webhook.succeeded", {
          ...requestContext,
          webhookType: event.type,
          clerkUserId: deletedUserId,
        });
        break;
      }
      default:
        logWarn("auth.clerk_webhook.ignored", {
          ...requestContext,
          webhookType: event.type,
        });
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    logError("auth.clerk_webhook.failed", error, {
      ...requestContext,
    });
    return new Response("invalid webhook", { status: 400 });
  }
}
