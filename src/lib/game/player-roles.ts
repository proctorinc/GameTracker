import type { GamePlayerRole } from "@/lib/db/schema";

export type EffectiveGamePlayerRole = GamePlayerRole | "creator";

export function getStoredGamePlayerRole(player: {
  isManager: boolean;
  role?: GamePlayerRole | null;
}): GamePlayerRole {
  return player.role ?? (player.isManager ? "manager" : "player");
}

export function getEffectiveGamePlayerRole(input: {
  creatorId: string;
  player: { isManager: boolean; role?: GamePlayerRole | null } | null | undefined;
  userId: string;
}): EffectiveGamePlayerRole {
  if (input.userId === input.creatorId) return "creator";
  return input.player ? getStoredGamePlayerRole(input.player) : "player";
}

export function canRoleManageGame(role: EffectiveGamePlayerRole) {
  return role === "creator" || role === "manager";
}

export function canRoleEditScore(input: {
  actorUserId: string;
  role: EffectiveGamePlayerRole;
  targetUserId: string;
}) {
  return (
    canRoleManageGame(input.role) ||
    (input.role === "self_scorer" && input.actorUserId === input.targetUserId)
  );
}

export function roleToLegacyManager(role: GamePlayerRole) {
  return role === "manager";
}
