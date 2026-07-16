import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidateTag, updateTag } = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidateTag,
  updateTag,
}));

import { revalidateProfileIdentity } from "./cache-invalidation";

describe("profile identity cache invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("immediately expires every cached screen containing profile identity data", () => {
    revalidateProfileIdentity();

    expect(updateTag).toHaveBeenCalledWith("profile-identity:global");
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});
