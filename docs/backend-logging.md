# Backend Logging Schema

This application uses structured JSON logs for backend-only execution paths:

- API routes
- server actions
- auth/session helpers
- proxy/auth gating
- server-side page data loaders

Frontend-only UI events should not be logged here.

## Event naming

Use dot-separated event names:

- `<domain>.<action>.<result>`
- Examples:
  - `auth.otp.request.succeeded`
  - `friends.invitation.accept.failed`
  - `dashboard.page_data.read.succeeded`

Recommended result suffixes:

- `succeeded`
- `rejected`
- `failed`
- `redirected`
- `allowed`
- `missing`

## Required fields

Every backend log should include these fields when available:

- `level`: `info`, `warn`, or `error`
- `event`: stable event name
- `correlationId`: request or action correlation identifier
- `requestMethod`: HTTP method when present
- `requestPath`: route/path when present
- `requestSource`: where the request context came from

## Recommended action fields

Include these when relevant:

- `userId`: authenticated actor ID
- `sessionId`: server session ID
- `reason`: rejection or redirect reason
- resource identifiers such as `gameId`, `invitationId`, `gameTitleId`, `gamePlayerId`
- small numeric summaries such as counts, round numbers, or boolean flags

Prefer IDs, counts, enum values, and state transitions over verbose payloads.

## PII and secrets

Never log:

- raw phone numbers
- OTP codes
- session tokens
- cookie values
- user names when an internal ID is enough

Allowed with redaction helpers:

- masked phone numbers such as `***1234`
- masked tokens only when strictly necessary

## Error handling

Use:

- `info` for successful reads/mutations and expected state transitions
- `warn` for rejected requests, auth failures, rate limits, and redirects
- `error` for unexpected exceptions

Unexpected exceptions should include normalized error metadata via `logError(...)`.

## Correlation IDs

Use the shared request-context helper to attach correlation data:

- `getRequestContextFromRequest(request)` for route/proxy handlers
- `getServerRequestContext()` for server actions and server-side loaders/helpers

If the platform provides `x-request-id`, `x-correlation-id`, `traceparent`, or `x-vercel-id`, that value is reused. Otherwise a fallback UUID is generated.
