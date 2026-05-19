export const DEFAULT_RETURN_PATH = "/dashboard";

export function sanitizeReturnPath(input: string | null | undefined): string {
  if (!input) {
    return DEFAULT_RETURN_PATH;
  }

  const value = input.trim();

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return DEFAULT_RETURN_PATH;
  }

  try {
    const url = new URL(value, "http://localhost");

    if (url.origin !== "http://localhost") {
      return DEFAULT_RETURN_PATH;
    }

    const safePath = `${url.pathname}${url.search}`;

    if (safePath === "/login" || safePath.startsWith("/login?")) {
      return DEFAULT_RETURN_PATH;
    }

    return safePath || DEFAULT_RETURN_PATH;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}
