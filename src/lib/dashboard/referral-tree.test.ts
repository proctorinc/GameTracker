import { describe, expect, it } from "vitest";
import {
  buildReferralTreeData,
  getInitialFocusNodeIds,
  type ReferralTreeGroup,
  type ReferralTreeReferral,
} from "./referral-tree";

const groups: ReferralTreeGroup[] = [
  {
    id: "group-a",
    city: "Seattle",
    region: "WA",
    display_location: "Seattle, WA",
    users: [
      {
        id: "user-a",
        first_name: "Alex",
        last_name: "Avery",
      },
    ],
  },
  {
    id: "group-b",
    city: "Portland",
    region: "OR",
    display_location: "Portland, OR",
    users: [
      {
        id: "user-b",
        first_name: "Blair",
        last_name: "Bennett",
      },
    ],
  },
  {
    id: "group-c",
    city: "Boise",
    region: "ID",
    display_location: "Boise, ID",
    users: [
      {
        id: "user-c",
        first_name: "Casey",
        last_name: "Cole",
      },
    ],
  },
];

describe("buildReferralTreeData", () => {
  it("maps referral direction from referrer to referee", () => {
    const referrals: ReferralTreeReferral[] = [
      {
        id: "ref-1",
        referrer_group_id: "group-a",
        referee_group_id: "group-b",
        status: "accepted",
      },
    ];

    const result = buildReferralTreeData({
      currentGroupId: "group-a",
      currentUserId: "user-a",
      groups,
      referrals,
    });

    expect(result.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ref-1",
          source: "group-a",
          target: "group-b",
        }),
      ]),
    );
  });

  it("styles the current group distinctly", () => {
    const result = buildReferralTreeData({
      currentGroupId: "group-a",
      currentUserId: "user-a",
      groups,
      referrals: [],
    });

    const currentNode = result.nodes.find((node) => node.id === "group-a");
    const otherNode = result.nodes.find((node) => node.id === "group-b");

    expect(currentNode).toEqual(
      expect.objectContaining({
        type: "groupBubble",
        data: expect.objectContaining({
          isCurrentGroup: true,
          statusTone: "current",
        }),
      }),
    );
    expect(currentNode?.style).toEqual(
      expect.objectContaining({
        width: 168,
        height: 168,
      }),
    );
    expect(currentNode?.data).not.toEqual(otherNode?.data);
  });

  it("marks pending referrals with pending styling", () => {
    const result = buildReferralTreeData({
      currentGroupId: "group-a",
      currentUserId: "user-a",
      groups,
      referrals: [
        {
          id: "ref-2",
          referrer_group_id: "group-a",
          referee_group_id: "group-b",
          status: "pending",
        },
      ],
    });

    expect(result.edges[0]).toEqual(
      expect.objectContaining({
        id: "ref-2",
        animated: true,
        label: "Pending",
        style: expect.objectContaining({
          strokeDasharray: "7 6",
        }),
      }),
    );
  });
});

describe("getInitialFocusNodeIds", () => {
  it("returns only the current group when there are no referrals", () => {
    expect(getInitialFocusNodeIds("group-a", [])).toEqual(["group-a"]);
  });

  it("includes outgoing neighbors", () => {
    const referrals: ReferralTreeReferral[] = [
      {
        id: "ref-1",
        referrer_group_id: "group-a",
        referee_group_id: "group-b",
        status: "accepted",
      },
    ];

    expect(getInitialFocusNodeIds("group-a", referrals)).toEqual(
      expect.arrayContaining(["group-a", "group-b"]),
    );
  });

  it("includes incoming neighbors", () => {
    const referrals: ReferralTreeReferral[] = [
      {
        id: "ref-1",
        referrer_group_id: "group-b",
        referee_group_id: "group-a",
        status: "accepted",
      },
    ];

    expect(getInitialFocusNodeIds("group-a", referrals)).toEqual(
      expect.arrayContaining(["group-a", "group-b"]),
    );
  });

  it("includes both parent and child groups without duplicates", () => {
    const referrals: ReferralTreeReferral[] = [
      {
        id: "ref-1",
        referrer_group_id: "group-b",
        referee_group_id: "group-a",
        status: "accepted",
      },
      {
        id: "ref-2",
        referrer_group_id: "group-a",
        referee_group_id: "group-c",
        status: "pending",
      },
      {
        id: "ref-3",
        referrer_group_id: "group-a",
        referee_group_id: "group-c",
        status: "pending",
      },
    ];

    expect(getInitialFocusNodeIds("group-a", referrals).sort()).toEqual([
      "group-a",
      "group-b",
      "group-c",
    ]);
  });
});
