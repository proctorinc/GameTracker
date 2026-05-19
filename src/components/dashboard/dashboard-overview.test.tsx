import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardOverview } from "./dashboard-overview";

vi.mock("./referral-tree-graph", () => ({
  ReferralTreeGraph: () => "<graph />",
}));

describe("DashboardOverview", () => {
  it("shows a helpful empty-network message when there are no referrals", () => {
    const markup = renderToStaticMarkup(
      <DashboardOverview
        user={{
          id: "user-a",
          first_name: "Alex",
          last_name: "Avery",
          phone_last4: "1111",
        }}
        group={{
          id: "group-a",
          city: "Seattle",
          region: "WA",
          display_location: "Seattle, WA",
          users: [
            {
              id: "user-a",
              first_name: "Alex",
              last_name: "Avery",
              phone_last4: "1111",
            },
          ],
        }}
        network={{
          groups: [
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
                  phone_last4: "1111",
                },
              ],
            },
          ],
          referrals: [],
        }}
        pendingReferrals={[]}
      />,
    );

    expect(markup).toContain("&lt;graph /&gt;");
    expect(markup).toContain(
      "No referral relationships found yet. Your group is ready to become the first branch in the tree.",
    );
  });
});
