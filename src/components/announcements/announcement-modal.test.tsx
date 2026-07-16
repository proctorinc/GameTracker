import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import { AnnouncementModal } from "./announcement-modal";

const { acknowledgeAnnouncementAction, push } = vi.hoisted(() => ({
  acknowledgeAnnouncementAction: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push }),
}));

vi.mock("@/app/actions/announcements", () => ({
  acknowledgeAnnouncementAction,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

const announcements = [
  {
    id: "announcement-1",
    title: "Profile backgrounds",
    details: "Choose a new background\nfrom your profile.",
    screenshotUrl: "https://example.com/backgrounds.webp",
    actionLabel: "Choose a background",
    actionHref: "/profile/backgrounds",
    publishedAt: "2026-07-15T12:00:00.000Z",
  },
  {
    id: "announcement-2",
    title: "Another update",
    details: "More good things.",
    screenshotUrl: null,
    actionLabel: null,
    actionHref: null,
    publishedAt: "2026-07-16T12:00:00.000Z",
  },
];

describe("AnnouncementModal", () => {
  beforeEach(() => {
    acknowledgeAnnouncementAction.mockReset();
    push.mockReset();
  });

  it("acknowledges the current announcement before following its action", async () => {
    acknowledgeAnnouncementAction.mockResolvedValue({ acknowledged: true });
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementModal announcements={announcements} />);

    await user.click(
      screen.getByRole("button", { name: "Choose a background" }),
    );

    await waitFor(() =>
      expect(acknowledgeAnnouncementAction).toHaveBeenCalledWith({
        announcementId: "announcement-1",
      }),
    );
    expect(push).toHaveBeenCalledWith("/profile/backgrounds");
    expect(screen.queryByText("Another update")).not.toBeInTheDocument();
  });

  it("highlights the custom action instead of the acknowledgment button", () => {
    renderWithProviders(<AnnouncementModal announcements={[announcements[0]!]} />);

    expect(
      screen.getByRole("button", { name: "Choose a background" }),
    ).toHaveClass("bg-primary");
    expect(screen.getByRole("button", { name: "Got it" })).not.toHaveClass(
      "bg-primary",
    );
  });

  it("highlights the acknowledgment button when there is no custom action", () => {
    renderWithProviders(<AnnouncementModal announcements={[announcements[1]!]} />);

    expect(screen.getByRole("button", { name: "Got it" })).toHaveClass(
      "bg-primary",
    );
  });

  it("suppresses the entire queue on a configured destination page", () => {
    renderWithProviders(
      <AnnouncementModal
        announcements={[
          { ...announcements[0]!, actionHref: "/dashboard?tab=updates" },
          announcements[1]!,
        ]}
      />,
    );

    expect(screen.queryByText("Profile backgrounds")).not.toBeInTheDocument();
    expect(screen.queryByText("Another update")).not.toBeInTheDocument();
    expect(acknowledgeAnnouncementAction).not.toHaveBeenCalled();
  });

  it("acknowledges each announcement before advancing through the queue", async () => {
    acknowledgeAnnouncementAction.mockResolvedValue({ acknowledged: true });
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementModal announcements={announcements} />);

    expect(screen.getByText("Profile backgrounds")).toBeInTheDocument();
    expect(screen.getByText(/1 of 2/)).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      announcements[0]!.screenshotUrl,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(acknowledgeAnnouncementAction).toHaveBeenCalledWith({
        announcementId: "announcement-1",
      }),
    );
    expect(screen.getByText("Another update")).toBeInTheDocument();
    expect(screen.getByText(/2 of 2/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() =>
      expect(screen.queryByText("Another update")).not.toBeInTheDocument(),
    );
  });

  it("keeps the current announcement visible when acknowledgment fails", async () => {
    acknowledgeAnnouncementAction.mockRejectedValue(new Error("Try again"));
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementModal announcements={announcements} />);

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() =>
      expect(screen.getByText("Profile backgrounds")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Another update")).not.toBeInTheDocument();
  });

  it("closes without acknowledging when the close button is used", async () => {
    const user = userEvent.setup();
    renderWithProviders(<AnnouncementModal announcements={[announcements[0]!]} />);

    await user.click(screen.getByRole("button", { name: "Close" }));

    await waitFor(() =>
      expect(screen.queryByText("Profile backgrounds")).not.toBeInTheDocument(),
    );
    expect(acknowledgeAnnouncementAction).not.toHaveBeenCalled();
  });
});
