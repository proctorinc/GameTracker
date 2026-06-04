import type { UserBase } from "@/lib/db/store/user.store";

export type AuthUser = UserBase;

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
