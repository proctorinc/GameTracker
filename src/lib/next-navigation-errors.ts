export function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }

  return typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT");
}
