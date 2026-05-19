import { UnauthorizedError, type AuthUser } from "./session";
import {
  getGroupById,
  getPendingReferralsForGroup,
  getReferralNetwork,
  getUsersInGroups,
  type UserRow,
} from "@/lib/db/group-store";

export interface MaskedUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  group_id: string | null;
  phone_last4: string;
}

export interface AuthMeUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  group_id: string | null;
  phone_last4: string;
}

export interface AuthMeGroup {
  id: string;
  city: string | null;
  region: string | null;
  country: string | null;
  display_location: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string | null;
  updated_at: string | null;
  users: MaskedUser[];
}

export interface AuthMeData {
  user: AuthMeUser;
  group: AuthMeGroup;
  network: {
    groups: AuthMeGroup[];
    referrals: Awaited<ReturnType<typeof getReferralNetwork>>["referrals"];
  };
  pending_referrals: Awaited<ReturnType<typeof getPendingReferralsForGroup>>;
}

function toPhoneLast4(phoneE164: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return digits.slice(-4).padStart(4, "0");
}

function toMaskedUser(user: Pick<UserRow, "id" | "first_name" | "last_name" | "group_id" | "phone_e164">): MaskedUser {
  return {
    id: user.id,
    first_name: user.first_name,
    last_name: user.last_name,
    group_id: user.group_id,
    phone_last4: toPhoneLast4(user.phone_e164),
  };
}

export async function loadAuthMeData(user: AuthUser): Promise<AuthMeData> {
  if (!user.group_id) {
    throw new UnauthorizedError("User does not belong to a group");
  }

  const group = await getGroupById(user.group_id);

  if (!group) {
    throw new UnauthorizedError("User group not found");
  }

  const [network, pendingReferrals] = await Promise.all([
    getReferralNetwork(user.group_id),
    getPendingReferralsForGroup(user.group_id),
  ]);
  const groupIds = Array.from(new Set([group.id, ...network.groups.map((item) => item.id)]));
  const networkUsers = await getUsersInGroups(groupIds);
  const usersByGroupId = new Map<string, MaskedUser[]>();

  for (const networkUser of networkUsers) {
    if (!networkUser.group_id) {
      continue;
    }

    const existing = usersByGroupId.get(networkUser.group_id) ?? [];
    existing.push(toMaskedUser(networkUser));
    usersByGroupId.set(networkUser.group_id, existing);
  }

  const groupsWithUsers = network.groups.map((networkGroup) => ({
    ...networkGroup,
    users: usersByGroupId.get(networkGroup.id) ?? [],
  }));
  const currentGroup =
    groupsWithUsers.find((networkGroup) => networkGroup.id === group.id) ?? {
      ...group,
      users: usersByGroupId.get(group.id) ?? [],
    };

  return {
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      group_id: user.group_id,
      phone_last4: toPhoneLast4(user.phone_e164),
    },
    group: currentGroup,
    network: {
      groups: groupsWithUsers,
      referrals: network.referrals,
    },
    pending_referrals: pendingReferrals,
  };
}
