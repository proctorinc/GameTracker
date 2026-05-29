export async function createSessionFixture(
  userId: string,
  rawToken = "test-session-token",
) {
  const { createSession } = await import("../../src/lib/db/store/session.store");
  const { hashTokenWithSecret } = await import("../../src/lib/auth/tokens");

  const session = await createSession(
    userId,
    hashTokenWithSecret(rawToken),
    new Date(Date.now() + 1000 * 60 * 60).toISOString(),
  );

  return {
    rawToken,
    session,
  };
}
