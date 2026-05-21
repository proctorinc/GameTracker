import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { findUserById } from './lib/auth/user-store';
import { getSessionByToken } from './lib/auth';

const PUBLIC_ROUTES = ['/login', '/'];
const ONBOARDING_ROUTE = '/profile/complete';
const SESSION_COOKIE_NAME = "app_session";

export default async function proxy(request: NextRequest) {
    const { nextUrl, cookies } = request;
    const pathname = nextUrl.pathname;
  
    const sessionToken = cookies.get(SESSION_COOKIE_NAME)?.value
    const isAuthenticated = !!sessionToken

    const isPublicOrAuth = PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))

    if (!isPublicOrAuth && !isAuthenticated) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname) 
        return NextResponse.redirect(loginUrl)
    }

    let isProfileComplete = false;
    let isValidSession = false;

    if (sessionToken) {
        try {
            const session = await getSessionByToken(sessionToken);
            
            if (session?.user?.id) {
                const userData = await findUserById(session.user.id);
                
                if (userData) {
                    isValidSession = true;
                    isProfileComplete = !!userData.is_profile_complete;
                }
            }
        } catch (error) {
            console.error("Proxy auth lookup failed:", error);
        }
    }

    if (!isPublicOrAuth && !isValidSession) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        // Force clear the orphaned cookie so they aren't stuck in a proxy loop
        response.cookies.delete(SESSION_COOKIE_NAME);
        return response;
    }

    const isAuthRoute = ['/login', '/register'].some((route) => pathname.startsWith(route))
    if (isAuthRoute && isValidSession) {
        const dest = isProfileComplete ? '/dashboard' : ONBOARDING_ROUTE
        return NextResponse.redirect(new URL(dest, request.url))
    }

    if (!isPublicOrAuth && isValidSession && !isProfileComplete && pathname !== ONBOARDING_ROUTE) {
        return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        /*
        * Match all request paths except for internal Next.js paths and static assets
        */
        '/((?!_next/static|_next/image|api|favicon.ico).*)',
    ],
}