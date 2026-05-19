import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReferralTreeGraph } from "@/components/dashboard/referral-tree-graph";
import {
  formatGroupName,
  formatMemberList,
  getConnectedReferralsForGroup,
  type ReferralTreeGroup,
  type ReferralTreeReferral,
  type ReferralTreeUser,
} from "@/lib/dashboard/referral-tree";

export interface DashboardOverviewProps {
  user: ReferralTreeUser;
  group: ReferralTreeGroup;
  network: {
    groups: ReferralTreeGroup[];
    referrals: ReferralTreeReferral[];
  };
  pendingReferrals: ReferralTreeReferral[];
}

export function DashboardOverview({
  user,
  group,
  network,
  pendingReferrals,
}: DashboardOverviewProps) {
  const groupsById = new Map(network.groups.map((item) => [item.id, item]));
  const connectedReferrals = getConnectedReferralsForGroup(group.id, network.referrals);

  return (
    <div className="space-y-6">
      {/* <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Signed in as {user.first_name ?? "Member"} (ending in {user.phone_last4})
        </p>
      </div> */}
      <ReferralTreeGraph
        currentGroupId={group.id}
        currentUserId={user.id}
        groups={network.groups}
        referrals={network.referrals}
      />
      {network.referrals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No referral relationships found yet. Your group is ready to become the
          first branch in the tree.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Arrows point from the referrer to the referee, with referrers positioned
          above the groups they invited.
        </p>
      )}

      <Card size="sm">
        <CardHeader>
          <CardTitle>Your Group</CardTitle>
          <CardDescription>{formatGroupName(group)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Members: {formatMemberList(group.users, user.id)}
              </p>
            </div>
            <Badge variant="default">Your group</Badge>
          </div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Referrer Data</CardTitle>
          <CardDescription>
            Existing relationships and pending referrals involving your group.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          {connectedReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No referral relationships found for your group yet.
            </p>
          ) : (
            connectedReferrals.map((referral) => {
              const isOutgoing = referral.referrer_group_id === group.id;
              const otherGroupId = isOutgoing
                ? referral.referee_group_id
                : referral.referrer_group_id;
              const otherGroup = groupsById.get(otherGroupId);

              return (
                <div
                  key={referral.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{formatGroupName(otherGroup)}</p>
                    <p className="text-sm text-muted-foreground">
                      {isOutgoing ? "You referred this group" : "This group referred you"}
                    </p>
                    {otherGroup && otherGroup.users.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Members: {formatMemberList(otherGroup.users)}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      referral.status === "accepted"
                        ? "default"
                        : referral.status === "pending"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {referral.status}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card size="sm">
        <CardHeader>
          <CardTitle>Pending Referrals</CardTitle>
          <CardDescription>
            Referrals awaiting a response or confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-4">
          {pendingReferrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending referrals right now.
            </p>
          ) : (
            pendingReferrals.map((referral) => {
              const isOutgoing = referral.referrer_group_id === group.id;
              const otherGroupId = isOutgoing
                ? referral.referee_group_id
                : referral.referrer_group_id;
              const otherGroup = groupsById.get(otherGroupId);

              return (
                <div
                  key={referral.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{formatGroupName(otherGroup)}</p>
                    <p className="text-sm text-muted-foreground">
                      {isOutgoing ? "Awaiting referee response" : "Awaiting your response"}
                    </p>
                    {otherGroup && otherGroup.users.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Members: {formatMemberList(otherGroup.users)}
                      </p>
                    )}
                  </div>
                  <Badge variant="secondary">{referral.status}</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
