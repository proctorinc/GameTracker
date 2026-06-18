import { DEFAULT_RETURN_PATH, sanitizeReturnPath } from "./return-path";

export function getPostLoginPath(input: {
  requestedPath?: string | null;
  hasPendingInvitations: boolean;
}) {
  const safeRequestedPath = sanitizeReturnPath(input.requestedPath);

  if (
    input.hasPendingInvitations &&
    safeRequestedPath === DEFAULT_RETURN_PATH
  ) {
    return "/profile?tab=friends&invites=1";
  }

  return safeRequestedPath;
}
