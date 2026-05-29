import { UserBase } from "@/lib/db/store";

export const limitSigFigs = (num: number, sigFigs: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumSignificantDigits: sigFigs,
  }).format(num);
};

export function getInitials(user: Pick<UserBase, "firstName" | "lastName">) {
  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.trim();
  return initials || "?";
}
