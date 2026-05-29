"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import {
  buildReferralTreeData,
  getInitialFocusNodeIds,
  type ReferralTreeEdge,
  type ReferralTreeGroup,
  type ReferralTreeNode,
  type ReferralTreeReferral,
} from "@/lib/dashboard/referral-tree";
import { ReferralTreeBubbleNode } from "@/components/dashboard/referral-tree-bubble-node";

export interface ReferralTreeGraphProps {
  currentGroupId: string;
  currentUserId: string;
  groups: ReferralTreeGroup[];
  referrals: ReferralTreeReferral[];
}

const nodeTypes = {
  groupBubble: ReferralTreeBubbleNode,
} satisfies NodeTypes;

function ReferralTreeGraphCanvas({
  currentGroupId,
  currentUserId,
  groups,
  referrals,
}: ReferralTreeGraphProps) {
  const hasFocusedRef = useRef(false);
  const nodesInitialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  const data = useMemo(
    () =>
      buildReferralTreeData({
        currentGroupId,
        currentUserId,
        groups,
        referrals,
      }),
    [currentGroupId, currentUserId, groups, referrals],
  );

  useEffect(() => {
    hasFocusedRef.current = false;
  }, [currentGroupId, groups, referrals]);

  useEffect(() => {
    if (!nodesInitialized || hasFocusedRef.current === true) {
      return;
    }

    hasFocusedRef.current = true;

    const focusNodeIds = getInitialFocusNodeIds(currentGroupId, referrals);

    void fitView({
      nodes: focusNodeIds.map((id) => ({ id })),
      duration: 0,
      padding: 0.32,
      minZoom: 0.72,
      maxZoom: 1.2,
    });
  }, [currentGroupId, fitView, nodesInitialized, referrals]);

  return (
    <div className="h-screen w-full overflow-hidden rounded-[2rem]">
      <ReactFlow<ReferralTreeNode, ReferralTreeEdge>
        className="h-full w-full"
        nodes={data.nodes}
        edges={data.edges}
        nodeTypes={nodeTypes}
        nodeOrigin={[0.5, 0.5]}
        fitView={false}
        minZoom={0.25}
        maxZoom={1.6}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          selectable: false,
          focusable: false,
        }}
      >
        {/* <Background
          color="#f59e0b"
          gap={32}
          size={1}
          className="opacity-25"
        /> */}
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>
    </div>
  );
}

export function ReferralTreeGraph(props: ReferralTreeGraphProps) {
  return (
    <ReactFlowProvider>
      <ReferralTreeGraphCanvas
        {...props}
      />
    </ReactFlowProvider>
  );
}
