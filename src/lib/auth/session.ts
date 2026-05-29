export interface AuthUser {
  id: string;
  role: "user" | "admin";
  phoneNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  phone_verified_at: string | null;
  isProfileComplete: boolean;
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
