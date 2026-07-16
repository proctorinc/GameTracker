import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RoundWinnerPlayGameV2Screen } from "./round-winner-screen";

const playGameSpy = vi.fn(() => <div>play-game-shell</div>);

vi.mock("@/components/game/PlayGame", () => ({
  __esModule: true,
  default: (props: unknown) => playGameSpy(props),
}));

describe("RoundWinnerPlayGameV2Screen", () => {
  it("routes round-winner games through the standard PlayGame shell", () => {
    render(
      <RoundWinnerPlayGameV2Screen
        actions={{} as never}
        config={{ requiresPlacementTieBreak: false } as never}
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
          liveMode: "round_winner",
          requiresScoredTieBreak: false,
        },
      }),
    );
  });
});
