# Authentication Verification Guide

## Overview

This app implements phone-based authentication using E.164 normalized phone numbers and SMS OTP via Twilio Verify. Sessions use server-side storage with HTTP-only cookies for secure client authentication.

## Architecture

### Authentication Flow

1. **Request OTP**: User enters phone number → API normalizes to E.164, rate-limits, sends SMS
2. **Verify OTP**: User enters code → API validates via Twilio Verify
3. **Session Creation**: On successful verify, server creates session with hashed token
4. **Protected Access**: All non-auth API routes require valid session cookie

### Security Design

- **Cookie-based sessions**: HttpOnly + Secure (prod) + SameSite=Lax
- **Token hashing**: SHA-256 of random 32-byte tokens stored in DB
- **Rate limiting**: Max 3 OTP requests per hour via `otp_rate_limits` table
- **Session rotation**: New session replaces old ones on each login
- **Enumeration protection**: Same response for existing/non-existent users

## Environment Variables

Add to `.env.local`:

```bash
# Database
DATABASE_URL=file:./data/dev.sqlite

# Twilio Verify (production)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_VERIFY_SERVICE_SID=your_verify_service_sid

# Session hashing secret (32+ random bytes, generate with `openssl rand -hex 32`)
SESSION_SECRET=your_long_random_secret_string_here

# Optional: Development mock OTP (tests and dev only)
AUTH_MOCK_OTP=123456

# Node environment (affects cookie security flags)
NODE_ENV=production
```

## API Endpoints

### Request OTP

```bash
POST /api/auth/otp/request
Content-Type: application/json

{ "phone": "+15551234567" }
```

Response: `200` with `{ ok: true, dev: boolean }` or `400` (invalid phone) or `429` (rate limited)

### Verify OTP

```bash
POST /api/auth/otp/verify
Content-Type: application/json
Cookie: app_session=<opaque-token>

{ "phone": "+15551234567", "code": "123456" }
```

Response: `200` with `{ user: { id, phone }, sessionId }` + Set-Cookie header

### Logout

```bash
POST /api/auth/logout
Cookie: app_session=<opaque-token>
```

Response: `204` with cleared cookie

### Protected Route Template

```ts
// src/app/api/example/route.ts
import { requireAuth } from "@/lib/auth/require-auth";

export const GET = withAuth(async (_req) => {
  return Response.json({ message: "Authenticated" });
});
```

## Testing

### Unit Tests

```bash
npm test  # Run all tests
npm run test:coverage  # Coverage report (target ≥80% on src/lib/auth/**)
```

### Integration Test Results

All 27 tests pass including:
- Phone normalization (US/international, leading zeros)
- Rate limiting
- OTP request/verify flows
- Session creation and validation
- Logout flow

## Manual Testing Checklist

### Step 1: Request OTP
```bash
curl -i -X POST http://localhost:3000/api/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567"}'
# Expected: 200 OK with {"ok":true,"dev":true} in development
```

### Step 2: Verify OTP (without cookie first)
```bash
curl -i -X POST http://localhost:3000/api/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"phone":"+15551234567","code":"123456"}'
# Expected: 200 with session cookie set (with AUTH_MOCK_OTP=123456)
```

### Step 3: Protected endpoint without cookie
```bash
curl -i http://localhost:3000/api/example
# Expected: 401 Unauthorized
```

### Step 4: Protected endpoint with session cookie
```bash
curl -i http://localhost:3000/api/example \
  -b cookies.txt
# Expected: 200 OK with response body
```

### Step 5: Logout
```bash
curl -i -b cookies.txt -X POST http://localhost:3000/api/auth/logout
# Expected: 204 with cleared cookie
```

### Step 6: Verify logout worked
```bash
curl -i http://localhost:3000/api/example
# Expected: 401 Unauthorized again
```

## File Structure

```
src/
├── lib/auth/
│   ├── phone.ts                # Phone normalization to E.164
│   ├── tokens.ts               # Token generation and hashing
│   ├── session-store.ts        # Session CRUD operations
│   ├── user-store.ts           # User lookup and creation
│   ├── require-auth.ts         # Auth guard helper
│   ├── cookies.ts              # Cookie helpers
│   ├── index.ts                # Re-exports
│   └── *.test.ts               # Unit tests
├── lib/twilio/
│   ├── verify.ts               # Twilio Verify client (production)
│   ├── verify-mock.ts          # Mock for tests/dev
│   ├── types.ts                # Provider interface
│   └── service.ts              # Service factory + provider resolution
├── app/api/auth/otp/request/route.ts      # Request OTP handler
├── app/api/auth/otp/verify/route.ts       # Verify OTP handler
├── app/api/auth/logout/route.ts           # Logout handler
├── app/api/example/route.ts               # Protected route template
├── middleware.ts                 # Page router middleware
└── schema/
    ├── users.ts                  # Users table schema
    └── sessions.ts               # Sessions table schema
```

## Security Notes

- Never log OTP codes, session tokens, or Twilio secrets
- `SESSION_SECRET` must be 32+ random bytes (use `openssl rand -hex 32`)
- Test environments should use `AUTH_MOCK_OTP` to avoid SMS costs
- Production deployment: set `NODE_ENV=production` for Secure cookie flag

## Migration Notes

When adding new protected endpoints:
1. Import `requireAuth` or `withAuth` from `@/lib/auth/require-auth`
2. Call at the top of route handler before any data operations
3. Handle errors gracefully (401 for auth failures, not 500)

Example pattern:
```ts
export const GET = withAuth(async (_req, { user }) => {
  // Safely access user.data without worrying about missing auth
  return Response.json({ userId: user.id });
});
```
