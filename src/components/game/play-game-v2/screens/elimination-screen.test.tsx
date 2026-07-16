import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EliminationPlayGameV2Screen } from "./elimination-screen";

const playGameSpy = vi.fn(() => <div>play-game-shell</div>);

vi.mock("@/components/game/PlayGame", () => ({
  __esModule: true,
  default: (props: unknown) => playGameSpy(props),
}));

describe("EliminationPlayGameV2Screen", () => {
  it("routes elimination games through the standard PlayGame shell", () => {
    render(
      <EliminationPlayGameV2Screen
        actions={{} as never}
        config={{ requiresPlacementTieBreak: true } as never}
        pendingActionKeys={new Set()}
        props={{ game: { id: "game-1" } } as never}
        snapshot={{} as never}
        viewModel={{} as never}
      />,
    );

    expect(screen.getByText("play-game-shell")).toBeInTheDocument();
    expect(playGameSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        compatibilityConfig: {
          allowAnyVersion: true,
          liveMode: "elimination",
          requiresScoredTieBreak: true,
        },
      }),
    );
  });
});
