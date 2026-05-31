import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { findUserById } from "./lib/db/store/user.store";
import { getSessionByTokenHash } from "./lib/db/store/session.store";
import { hashTokenWithSecret } from "./lib/auth/tokens";
import { isValidSession } from "./lib/auth/protected-session";
import { logError, logInfo, logWarn } from "./lib/server-log";
import { getRequestContextFromRequest } from "./lib/server-request-context";

const PUBLIC_ROUTES = ["/login", "/"];
const ONBOARDING_ROUTE = "/profile/complete";
const SESSION_COOKIE_NAME = "app_session";

export default async function proxy(request: NextRequest) {
  const { nextUrl, cookies } = request;
  const pathname = nextUrl.pathname;
  const requestContext = getRequestContextFromRequest(request);

  const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = !!sessionToken;

  const isPublicOrAuth = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );

  if (!isPublicOrAuth && !isAuthenticated) {
    logInfo("proxy.redirected", {
      ...requestContext,
      reason: "missing_session_cookie",
      redirectDestination: "/login",
    });
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let isProfileComplete = false;
  let hasValidSession = false;

  if (sessionToken) {
    try {
      const session = await getSessionByTokenHash(
        hashTokenWithSecret(sessionToken),
      );

      if (session?.user?.id && isValidSession(session)) {
        const userData = await findUserById(session.user.id);

        if (userData) {
          hasValidSession = true;
          isProfileComplete = !!userData.isProfileComplete;
        }
      }
    } catch (error) {
      logError("proxy.auth.lookup_failed", error, {
        ...requestContext,
      });
    }
  }

  if (!isPublicOrAuth && !hasValidSession) {
    logWarn("proxy.redirected", {
      ...requestContext,
      reason: "invalid_session_state",
      redirectDestination: "/login",
      hadSessionCookie: Boolean(sessionToken),
    });
    const response = NextResponse.redirect(new URL("/login", request.url));
    // Force clear the orphaned cookie so they aren't stuck in a proxy loop
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  const isAuthRoute = ["/login", "/register"].some((route) =>
    pathname.startsWith(route),
  );
  if (isAuthRoute && hasValidSession) {
    const dest = isProfileComplete ? "/dashboard" : ONBOARDING_ROUTE;
    logInfo("proxy.redirected", {
      ...requestContext,
      reason: "authenticated_user_on_auth_route",
      redirectDestination: dest,
    });
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (
    !isPublicOrAuth &&
    hasValidSession &&
    !isProfileComplete &&
    pathname !== ONBOARDING_ROUTE
  ) {
    logInfo("proxy.redirected", {
      ...requestContext,
      reason: "incomplete_profile",
      redirectDestination: ONBOARDING_ROUTE,
    });
    return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url));
  }

  logInfo("proxy.allowed", {
    ...requestContext,
    hasValidSession,
    isAuthenticated,
    isProfileComplete,
  });
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for internal Next.js paths and static assets
     */
    "/((?!_next/static|_next/image|api|favicon.ico).*)",
  ],
};
