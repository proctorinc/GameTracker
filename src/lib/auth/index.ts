export { UnauthorizedError, type AuthUser } from "./session";
export { requireAuth, withAuth } from "./require-auth";
export { getSessionTokenFromCookie, setSessionCookie, clearSessionCookie } from "./cookies";

export {
  createSession,
  getSessionByToken,
  deleteSession,
  isValidSession,
} from "./session-store";

export {
  findUserByPhone,
  findUserById,
  createVerifiedUserWithGroup,
  markPhoneVerified,
  ensureUserVerifiedAfterOtp,
  updateUserProfile,
  isPhoneVerified,
  type UserRow,
} from "./user-store";

export { normalizePhoneToE164, parsePhoneForInternalUse } from "./phone";
