import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import { AdminAnnouncementResetButton } from "./admin-announcement-reset-button";

const mocks = vi.hoisted(() => ({
  resetAnnouncementAcknowledgmentAction: vi.fn(),
  success: vi.fn(),
}));

vi.mock("@/app/actions/announcements", () => ({
  resetAnnouncementAcknowledgmentAction:
    mocks.resetAnnouncementAcknowledgmentAction,
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success, error: vi.fn() },
}));

describe("AdminAnnouncementResetButton", () => {
  it("marks the selected announcement unseen for the current admin", async () => {
    mocks.resetAnnouncementAcknowledgmentAction.mockResolvedValue({ reset: true });
    const user = userEvent.setup();
    renderWithProviders(
      <AdminAnnouncementResetButton
        announcementId="announcement-1"
        disabled={false}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Mark unseen for me" }),
    );

    await waitFor(() =>
      expect(mocks.resetAnnouncementAcknowledgmentAction).toHaveBeenCalledWith({
        announcementId: "announcement-1",
      }),
    );
    expect(mocks.success).toHaveBeenCalledWith(
      "Announcement marked unseen for you",
    );
  });
});
