export interface AuthUser {
  id: string;
  phone_e164: string;
  first_name: string | null;
  last_name: string | null;
  group_id: string | null;
  phone_verified_at: string | null;
}

/**
 * Session validation errors. Use specific messages for better logging/monitoring.
 */
export class UnauthorizedError extends Error {
  readonly code = "UNAUTHORIZED" as const;
  message: string;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
    this.message = message; // Definite assignment
  }
}
