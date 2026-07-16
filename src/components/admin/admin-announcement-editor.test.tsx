import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../tests/helpers/render";
import { AdminAnnouncementEditor } from "./admin-announcement-editor";

const actions = vi.hoisted(() => ({
  archiveAnnouncementAction: vi.fn(),
  createAnnouncementDraftAction: vi.fn(),
  publishAnnouncementAction: vi.fn(),
  updateAnnouncementDraftAction: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: actions.push, refresh: actions.refresh }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/app/actions/announcements", () => ({
  archiveAnnouncementAction: actions.archiveAnnouncementAction,
  createAnnouncementDraftAction: actions.createAnnouncementDraftAction,
  publishAnnouncementAction: actions.publishAnnouncementAction,
  updateAnnouncementDraftAction: actions.updateAnnouncementDraftAction,
}));

describe("AdminAnnouncementEditor", () => {
  it("creates a draft and navigates to its editor", async () => {
    actions.createAnnouncementDraftAction.mockResolvedValue({ id: "new-id" });
    const user = userEvent.setup();
    renderWithProviders(<AdminAnnouncementEditor />);

    await user.type(screen.getByLabelText("Title"), "Profile backgrounds");
    await user.type(screen.getByLabelText("Details"), "Pick a new look.");
    await user.click(screen.getByRole("button", { name: "Create draft" }));

    await waitFor(() => expect(actions.createAnnouncementDraftAction).toHaveBeenCalled());
    const formData = actions.createAnnouncementDraftAction.mock.calls[0]![0] as FormData;
    expect(formData.get("title")).toBe("Profile backgrounds");
    expect(formData.get("details")).toBe("Pick a new look.");
    expect(actions.push).toHaveBeenCalledWith("/admin/announcements/new-id");
  });

  it("locks published content and allows archiving", async () => {
    actions.archiveAnnouncementAction.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    renderWithProviders(
      <AdminAnnouncementEditor
        announcement={{
          id: "announcement-1",
          title: "Published update",
          details: "Already released.",
          screenshotUrl: null,
          createdByUserId: "admin-1",
          publishedAt: "2026-07-16T12:00:00.000Z",
          archivedAt: null,
          createdAt: "2026-07-16T11:00:00.000Z",
          updatedAt: "2026-07-16T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByLabelText("Title")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Archive" }));
    await waitFor(() =>
      expect(actions.archiveAnnouncementAction).toHaveBeenCalledWith({
        announcementId: "announcement-1",
      }),
    );
  });
});
