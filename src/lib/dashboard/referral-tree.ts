import dagre from "dagre";
import { MarkerType, Position, type Edge, type Node } from "@xyflow/react";

export interface ReferralTreeUser {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone_last4: string;
}

export interface ReferralTreeGroup {
  id: string;
  city: string | null;
  region: string | null;
  display_location: string | null;
  users: ReferralTreeUser[];
}

export interface ReferralTreeReferral {
  id: string;
  referrer_group_id: string;
  referee_group_id: string;
  status: "pending" | "accepted" | "declined";
}

export interface ReferralTreeNodeData extends Record<string, unknown> {
  groupName: string;
  memberCountLabel: string;
  memberSummary: string;
  isCurrentGroup: boolean;
  statusTone: "current" | "default";
  location: string;
}

export interface ReferralTreeEdgeData extends Record<string, unknown> {
  status: ReferralTreeReferral["status"];
}

export type ReferralTreeNode = Node<ReferralTreeNodeData, "groupBubble">;
export type ReferralTreeEdge = Edge<ReferralTreeEdgeData, "smoothstep">;

export interface ReferralTreeData {
  nodes: ReferralTreeNode[];
  edges: ReferralTreeEdge[];
}

const CURRENT_GROUP_NODE_SIZE = { width: 168, height: 168 };
const DEFAULT_GROUP_NODE_SIZE = { width: 144, height: 144 };

export function formatGroupName(
  group: Pick<ReferralTreeGroup, "id" | "city" | "display_location"> | undefined,
): string {
  if (!group) {
    return "Unknown group";
  }

  return group.display_location ?? "";
}

export function formatMemberList(
  users: ReferralTreeUser[],
  currentUserId?: string,
): string {
  return users.map((user) => user.first_name + "\n" + user.last_name).join(", ");
}

function formatMemberCountLabel(group: ReferralTreeGroup): string {
  const memberCount = group.users.length;
  const memberSuffix = memberCount === 1 ? "member" : "members";

  return `${memberCount} ${memberSuffix}`;
}

function formatNodeTitle(group: ReferralTreeGroup, currentUserId?: string): string {
  const members = formatMemberList(group.users, currentUserId);

  if (!members) {
    return `${formatGroupName(group)}\nNo members listed`;
  }

  return `${formatGroupName(group)}\n${members}`;
}

function getNodeSize(isCurrentGroup: boolean) {
  const size = isCurrentGroup ? CURRENT_GROUP_NODE_SIZE : DEFAULT_GROUP_NODE_SIZE;

  return {
    width: size.width,
    height: size.height,
  };
}

function layoutReferralTreeNodes(
  nodes: ReferralTreeNode[],
  edges: ReferralTreeEdge[],
): ReferralTreeNode[] {
  const graph = new dagre.graphlib.Graph();

  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "TB",
    ranksep: 150,
    nodesep: 88,
    marginx: 48,
    marginy: 48,
  });

  for (const node of nodes) {
    const size = getNodeSize(node.data.isCurrentGroup);
    graph.setNode(node.id, size);
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);
  return nodes.map((node) => {
    const size = getNodeSize(node.data.isCurrentGroup);
    const layout = graph.node(node.id);

    return {
      ...node,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      position: {
        x: layout.x,
        y: layout.y,
      },
      style: {
        width: size.width,
        height: size.height,
      },
    };
  });
}

export function buildReferralTreeData(input: {
  currentGroupId: string;
  currentUserId?: string;
  groups: ReferralTreeGroup[];
  referrals: ReferralTreeReferral[];
}): ReferralTreeData {
  const nodes = input.groups.map((group) => {
    const isCurrentGroup = group.id === input.currentGroupId;

    return {
      id: group.id,
      type: "groupBubble",
      position: { x: 0, y: 0 },
      data: {
        groupName: formatGroupName(group),
        memberCountLabel: formatMemberCountLabel(group),
        memberSummary: formatMemberList(group.users),
        isCurrentGroup,
        statusTone: isCurrentGroup ? "current" : "default",
        location: group.display_location,
      },
    };
  }) satisfies ReferralTreeNode[];

  const edges = input.referrals.map((referral) => ({
    id: referral.id,
    type: "smoothstep",
    source: referral.referrer_group_id,
    target: referral.referee_group_id,
    animated: referral.status === "pending",
    label: referral.status === "pending" ? "Pending" : undefined,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 18,
      height: 18,
      color: referral.status === "pending" ? "#64748b" : "#1d4ed8",
    },
    style: {
      stroke: referral.status === "pending" ? "#94a3b8" : "#2563eb",
      strokeWidth: referral.status === "pending" ? 2 : 3,
      strokeDasharray: referral.status === "pending" ? "7 6" : undefined,
    },
    data: {
      status: referral.status,
    },
  })) satisfies ReferralTreeEdge[];

  return {
    nodes: layoutReferralTreeNodes(nodes, edges),
    edges,
  };
}

export function getInitialFocusNodeIds(
  currentGroupId: string,
  referrals: ReferralTreeReferral[],
): string[] {
  const nodeIds = new Set<string>([currentGroupId]);

  for (const referral of referrals) {
    if (referral.referrer_group_id === currentGroupId) {
      nodeIds.add(referral.referee_group_id);
    }

    if (referral.referee_group_id === currentGroupId) {
      nodeIds.add(referral.referrer_group_id);
    }
  }

  return Array.from(nodeIds);
}

export function getConnectedReferralsForGroup(
  currentGroupId: string,
  referrals: ReferralTreeReferral[],
): ReferralTreeReferral[] {
  return referrals.filter(
    (referral) =>
      referral.referrer_group_id === currentGroupId ||
      referral.referee_group_id === currentGroupId,
  );
}
