"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { ReferralTreeNode, ReferralTreeUser } from "@/lib/dashboard/referral-tree";

function formatMembersNames(users: ReferralTreeUser[]): string {
  return users.map((user) => user.first_name + " " + user.last_name).join(", ")
}

export function ReferralTreeBubbleNode({
  data,
}: NodeProps<ReferralTreeNode>) {
  const isCurrentGroup = data.isCurrentGroup;

  return (
    <div
      className={[
        "relative flex h-full w-full items-center justify-center rounded-full border text-center shadow-[0_24px_45px_-24px_rgba(15,23,42,0.45)] transition-transform",
        isCurrentGroup
          ? "border-blue-900 bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 text-blue-50"
          : "border-amber-500 bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-50 text-amber-950",
      ].join(" ")}
      title={data.memberSummary}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
      <div className="flex max-w-[80%] flex-col items-center gap-2">
        <p
          className={[
            "line-clamp-3 text-balance font-serif leading-tight",
            isCurrentGroup ? "text-[1.15rem] font-semibold" : "text-[1.02rem] font-semibold",
          ].join(" ")}
        >
          {data.memberSummary}
        </p>
        {data.location && (
          <p
            className={[
              "rounded-full px-3 py-1 text-xs font-medium tracking-[0.14em] uppercase",
              isCurrentGroup
                ? "bg-white/16 text-blue-50"
                : "bg-amber-200/80 text-amber-900",
            ].join(" ")}
          >
            {data.location}
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2 !w-2 !border-0 !bg-transparent !opacity-0"
      />
    </div>
  );
}
