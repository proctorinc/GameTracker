import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { cache } from "react";

function firstHeaderValue(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  return headerValue.split(",")[0]?.trim() || null;
}

export type RequestLogContext = {
  correlationId: string;
  requestMethod: string | null;
  requestPath: string | null;
  requestSource: "request_headers" | "server_headers";
};

export function buildRequestLogContext(input: {
  headers: Headers;
  method?: string | null;
  path?: string | null;
  source: RequestLogContext["requestSource"];
}): RequestLogContext {
  const correlationId =
    firstHeaderValue(input.headers.get("x-request-id")) ??
    firstHeaderValue(input.headers.get("x-correlation-id")) ??
    firstHeaderValue(input.headers.get("traceparent")) ??
    firstHeaderValue(input.headers.get("x-vercel-id")) ??
    randomUUID();

  return {
    correlationId,
    requestMethod: input.method ?? null,
    requestPath: input.path ?? null,
    requestSource: input.source,
  };
}

const getCachedServerRequestContext = cache(async (): Promise<RequestLogContext> => {
  const requestHeaders = await headers();
  const headerMap = new Headers();

  requestHeaders.forEach((value, key) => {
    headerMap.set(key, value);
  });

  return buildRequestLogContext({
    headers: headerMap,
    method: requestHeaders.get("x-http-method-override"),
    path: requestHeaders.get("x-pathname") ?? requestHeaders.get("next-url"),
    source: "server_headers",
  });
});

export async function getServerRequestContext() {
  return getCachedServerRequestContext();
}

export function getRequestContextFromRequest(request: Request): RequestLogContext {
  return buildRequestLogContext({
    headers: request.headers,
    method: request.method,
    path: new URL(request.url).pathname,
    source: "request_headers",
  });
}
