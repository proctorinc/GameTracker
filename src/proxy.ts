import { clerkMiddleware, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { upsertLocalUserFromClerkUser } from "@/lib/auth/clerk-user";
import { PROFILE_COMPLETION_BYPASS_COOKIE } from "@/lib/auth/profile-completion-cookie";
import { logError, logInfo } from "@/lib/server-log";
import { getRequestContextFromRequest } from "@/lib/server-request-context";

const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/sign-in", "/sign-up"]);
const ONBOARDING_ROUTE = "/profile/complete";

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.has(pathname);
}

function isAuthRoute(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/sign-in" ||
    pathname === "/sign-up"
  );
}

function isApiRoute(pathname: string) {
  return pathname.startsWith("/api/");
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const pathname = request.nextUrl.pathname;
  const requestContext = getRequestContextFromRequest(request);
  const authState = await auth();
  const hasProfileCompletionBypass =
    request.cookies.get(PROFILE_COMPLETION_BYPASS_COOKIE)?.value === "1";

  if (isApiRoute(pathname)) {
    return NextResponse.next();
  }

  if (!isPublicRoute(pathname) && !authState.userId) {
    logInfo("proxy.redirected", {
      ...requestContext,
      reason: "missing_clerk_user",
      redirectDestination: "/login",
    });
    return authState.redirectToSignIn({ returnBackUrl: request.url });
  }

  if (!authState.userId) {
    logInfo("proxy.allowed", {
      ...requestContext,
      hasClerkUser: false,
      isPublicRoute: isPublicRoute(pathname),
    });
    return NextResponse.next();
  }

  try {
    const backendUser = await (await clerkClient()).users.getUser(authState.userId);
    const localUser = await upsertLocalUserFromClerkUser(backendUser);

    if (isAuthRoute(pathname)) {
      const destination = localUser.isProfileComplete
        ? "/dashboard"
        : ONBOARDING_ROUTE;
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (
      pathname !== ONBOARDING_ROUTE &&
      !localUser.isProfileComplete &&
      !isPublicRoute(pathname) &&
      !hasProfileCompletionBypass
    ) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url));
    }

    const response = NextResponse.next();

    if (localUser.isProfileComplete && hasProfileCompletionBypass) {
      response.cookies.delete(PROFILE_COMPLETION_BYPASS_COOKIE);
    }

    logInfo("proxy.allowed", {
      ...requestContext,
      hasClerkUser: true,
      userId: localUser.id,
      clerkUserId: authState.userId,
      isProfileComplete: localUser.isProfileComplete,
      hasProfileCompletionBypass,
    });
    return response;
  } catch (error) {
    logError("proxy.auth.lookup_failed", error, {
      ...requestContext,
      clerkUserId: authState.userId,
    });
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
