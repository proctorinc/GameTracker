import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, middleware } from "./middleware";

describe("middleware", () => {
  it("redirects protected routes without a session cookie", () => {
    const request = new NextRequest("http://localhost:3000/dashboard");
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?from=%2Fdashboard",
    );
  });

  it("preserves query strings in the redirect target", () => {
    const request = new NextRequest("http://localhost:3000/settings?tab=profile");
    const response = middleware(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?from=%2Fsettings%3Ftab%3Dprofile",
    );
  });

  it("allows public pages through", () => {
    const homeRequest = new NextRequest("http://localhost:3000/");
    const loginRequest = new NextRequest("http://localhost:3000/login");
    const homeResponse = middleware(homeRequest);
    const loginResponse = middleware(loginRequest);

    expect(homeResponse.status).toBe(200);
    expect(loginResponse.status).toBe(200);
  });

  it("allows api routes to bypass auth middleware via matcher exclusions", () => {
    const request = new NextRequest("http://localhost:3000/api/auth/me");

    expect(config.matcher).toContain("/((?!api|_next/static|_next/image|favicon.ico).*)");
    expect(request.nextUrl.pathname.startsWith("/api/")).toBe(true);
  });
});
