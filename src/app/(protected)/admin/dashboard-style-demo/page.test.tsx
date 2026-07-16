import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboardStyleDemoPage from "./page";

const requireAdminPageUser = vi.fn();
const getDashboardOverviewPageData = vi.fn();
const dashboardStyleDemoView = vi.fn(
  ({ data }: { data: { user: { firstName: string } } }) => (
    <div>demo view for {data.user.firstName}</div>
  ),
);

vi.mock("../admin-guard", () => ({
  requireAdminPageUser: () => requireAdminPageUser(),
}));

vi.mock("@/app/(protected)/dashboard/_components/page-data", () => ({
  getDashboardOverviewPageData: () => getDashboardOverviewPageData(),
}));

vi.mock("@/app/(protected)/dashboard/_components/dashboard-style-demo", () => ({
  DashboardStyleDemoView: (props: { data: { user: { firstName: string } } }) =>
    dashboardStyleDemoView(props),
}));

describe("AdminDashboardStyleDemoPage", () => {
  beforeEach(() => {
    requireAdminPageUser.mockReset();
    getDashboardOverviewPageData.mockReset();
    dashboardStyleDemoView.mockClear();
  });

  it("requires admin access before rendering the sandbox", async () => {
    requireAdminPageUser.mockResolvedValue({
      id: "admin-1",
      role: "admin",
    });
    getDashboardOverviewPageData.mockResolvedValue({
      user: {
        firstName: "Alex",
      },
    });

    render(await AdminDashboardStyleDemoPage());

    expect(requireAdminPageUser).toHaveBeenCalled();
    expect(getDashboardOverviewPageData).toHaveBeenCalled();
    expect(screen.getByText("demo view for Alex")).toBeInTheDocument();
  });

  it("bubbles the admin guard redirect before loading dashboard data", async () => {
    const redirectError = new Error("redirect");
    requireAdminPageUser.mockRejectedValue(redirectError);

    await expect(AdminDashboardStyleDemoPage()).rejects.toThrow("redirect");
    expect(getDashboardOverviewPageData).not.toHaveBeenCalled();
  });
});
