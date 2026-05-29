import type { UserInsert } from "../../src/lib/db/store/user.store";

let userCounter = 0;

export async function createUserFixture(overrides: Partial<UserInsert> = {}) {
  const { createUser } = await import("../../src/lib/db/store/user.store");
  userCounter += 1;

  return createUser({
    phoneNumber: `+1555000${String(1000 + userCounter).padStart(4, "0")}`,
    firstName: `Test${userCounter}`,
    lastName: "User",
    color: "#3366FF",
    isGuest: false,
    isProfileComplete: false,
    phone_verified_at: new Date().toISOString(),
    ...overrides,
  });
}
