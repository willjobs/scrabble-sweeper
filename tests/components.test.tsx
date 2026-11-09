// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { GameBoard } from "../src/components/GameBoard";
import { createGame, getPlayerView } from "../src/engine/game";
afterEach(cleanup);
test("board labels unknown squares without secret attributes; only callbacks handle staging", () => {
  const game = createGame("component", "SCORE_ONLY");
  const callback = vi.fn();
  const view = getPlayerView(game, 0);
  render(
    <GameBoard board={view.board} selected={0} notesMode onSquare={callback} />,
  );
  const cell = screen.getByTestId("cell-0");
  expect(cell.getAttribute("aria-label")).toBe("A1, empty");
  expect(cell.outerHTML).not.toMatch(/bonus-(?:TW|DW|TL|DL)/);
  fireEvent.click(cell);
  expect(callback).toHaveBeenCalledWith(0);
  expect(screen.getByTestId("cell-224").className).toContain("pair-highlight");
});
test("revealed ordinary and consumed premiums are accessible, notes distinctly labeled", () => {
  const game = createGame("component", "REVEAL_USED");
  const view = getPlayerView(game, 0);
  view.board[0] = {
    tile: { letter: "A", value: 0, blank: true },
    bonus: "NONE",
    note: 0,
    fresh: true,
  };
  view.board[224] = { tile: null, bonus: undefined, note: 0, fresh: false };
  render(<GameBoard board={view.board} selected={null} onSquare={() => {}} />);
  expect(screen.getByTestId("cell-0").getAttribute("aria-label")).toContain(
    "letter A, 0 points, blank, ordinary, consumed, your note",
  );
  expect(screen.getByTestId("cell-224").getAttribute("aria-label")).toBe(
    "O15, empty, your note: no possibilities",
  );
});

test("notes show actual hypotheses and keep contradictory guesses distinct from observations", () => {
  const view = getPlayerView(createGame("legibility", "SCORE_ONLY"), 0);
  view.board[0] = {
    tile: { letter: "Z", value: 10, blank: false },
    bonus: "DL",
    note: 16,
    fresh: true,
  };
  view.board[1] = { tile: null, note: 12, fresh: false };
  const { rerender } = render(
    <GameBoard
      board={view.board}
      selected={null}
      notesMode
      onSquare={() => {}}
    />,
  );
  expect(screen.getByTestId("cell-0").textContent).toBe("TW");
  expect(screen.getByTestId("cell-0").className).toContain("has-guess");
  expect(screen.getByTestId("cell-0").getAttribute("aria-label")).toContain(
    "DL, consumed, your note: TW",
  );
  expect(screen.getByTestId("cell-1").getAttribute("aria-label")).toContain(
    "your note: TL or DW",
  );
  rerender(
    <GameBoard board={view.board} selected={null} onSquare={() => {}} />,
  );
  expect(
    screen.getByTestId("cell-0").querySelector(".tile-letter")?.textContent,
  ).toBe("Z");
  expect(
    screen.getByTestId("cell-0").querySelector(".tile-points")?.textContent,
  ).toBe("10");
  expect(
    screen.getByTestId("cell-0").querySelector(".square-guess"),
  ).toBeNull();
});

test("a single click records one guess; multiple mode retains alternatives", async () => {
  const { NotesDock } = await import("../src/components/NotesDock");
  const onNote = vi.fn();
  const cell = { tile: null, note: 31, fresh: false };
  const { rerender } = render(<NotesDock at={0} cell={cell} onNote={onNote} />);
  fireEvent.click(screen.getByRole("button", { name: "TL" }));
  expect(onNote).toHaveBeenLastCalledWith(0, 4);
  fireEvent.click(screen.getByLabelText("Multiple possibilities"));
  rerender(<NotesDock at={0} cell={{ ...cell, note: 4 }} onNote={onNote} />);
  fireEvent.click(screen.getByRole("button", { name: "TW" }));
  expect(onNote).toHaveBeenLastCalledWith(0, 20);
});
