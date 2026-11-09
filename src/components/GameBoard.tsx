import { useLayoutEffect, useRef, useState } from "react";
import type { CellView } from "../engine/game";
import { coord, mirror } from "../engine/generator";
import { BONUSES } from "../engine/types";

const bonusLabel = (bonus: string) => (bonus === "NONE" ? "—" : bonus);

export function GameBoard({
  board,
  selected,
  onSquare,
  notesMode = false,
  cursor = null,
  direction = "across",
}: {
  board: (CellView & { staged?: boolean })[];
  selected: number | null;
  onSquare: (i: number) => void;
  notesMode?: boolean;
  cursor?: number | null;
  direction?: "across" | "down";
}) {
  const [enlarged, setEnlarged] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const focus = notesMode ? selected : cursor;
  const previous = useRef({ enlarged: false, focus });

  // Keep scrolling inside the board, including the next placement at an edge.
  useLayoutEffect(() => {
    const entering = enlarged && !previous.current.enlarged;
    const moved = focus !== null && focus !== previous.current.focus;
    previous.current = { enlarged, focus };
    if (!enlarged || (!entering && !moved) || !viewport.current) return;
    const at = entering
      ? (focus ?? selected ?? board.findIndex((cell) => cell.fresh))
      : focus;
    const target = viewport.current.querySelector<HTMLElement>(
      `[data-testid="cell-${at === null || at < 0 ? 112 : at}"]`,
    );
    if (!target) return;
    const frame = viewport.current.getBoundingClientRect();
    const square = target.getBoundingClientRect();
    if (entering) {
      viewport.current.scrollLeft +=
        square.left - frame.left - (frame.width - square.width) / 2;
      viewport.current.scrollTop +=
        square.top - frame.top - (frame.height - square.height) / 2;
    } else {
      const rowLabels =
        viewport.current.querySelector<HTMLElement>(".row-labels")!;
      const columnLabels =
        viewport.current.querySelector<HTMLElement>(".column-labels")!;
      const left = frame.left + viewport.current.clientLeft;
      const top = frame.top + viewport.current.clientTop;
      const right = left + viewport.current.clientWidth;
      const bottom = top + viewport.current.clientHeight;
      // Sticky coordinates cover part of the scrollport, so keep the entire
      // focused square clear of those labels as well as the outer edges.
      if (square.left < left + rowLabels.offsetWidth + 1)
        viewport.current.scrollLeft +=
          square.left - left - rowLabels.offsetWidth - 1;
      if (square.right > right)
        viewport.current.scrollLeft += square.right - right;
      if (square.top < top + columnLabels.offsetHeight + 1)
        viewport.current.scrollTop +=
          square.top - top - columnLabels.offsetHeight - 1;
      if (square.bottom > bottom)
        viewport.current.scrollTop += square.bottom - bottom;
    }
  }, [enlarged, focus, selected, board]);

  return (
    <div className={`board-wrap ${notesMode ? "notes-map" : "letter-map"}`}>
      <div className="board-view-tools">
        <span>{notesMode ? "Bonus & guess map" : "Letter board"}</span>
        <button
          aria-pressed={enlarged}
          onClick={() => setEnlarged((value) => !value)}
        >
          {enlarged ? "Fit board" : "Enlarge ⤢"}
        </button>
      </div>
      <div
        ref={viewport}
        className={`board-viewport ${enlarged ? "is-enlarged" : ""}`}
      >
        <div className="board-surface">
          <div className="column-labels" aria-hidden="true">
            {"ABCDEFGHIJKLMNO".split("").map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="board-with-rows">
            <div className="row-labels" aria-hidden="true">
              {Array.from({ length: 15 }, (_, i) => (
                <span key={i}>{i + 1}</span>
              ))}
            </div>
            <div
              className="board"
              role="group"
              aria-label="Word board, 15 rows and 15 columns"
            >
              {board.map((cell, i) => {
                const highlight =
                  selected !== null &&
                  (i === selected || (notesMode && i === mirror(selected)));
                const bonus = cell.bonus;
                const tile = cell.tile;
                const hasNote =
                  i !== 112 && cell.note !== undefined && cell.note !== 31;
                const guesses = hasNote
                  ? BONUSES.filter((_, bit) => cell.note! & (1 << bit))
                  : [];
                const noteDescription = hasNote
                  ? guesses.length
                    ? guesses
                        .map((b) => (b === "NONE" ? "ordinary" : b))
                        .join(" or ")
                    : "no possibilities"
                  : "";
                // Guesses get their own layer instead of competing with letters.
                const showNote = hasNote && (notesMode || !tile);
                const showBonus = !showNote && (notesMode || !tile) && bonus;
                return (
                  <button
                    key={i}
                    data-testid={`cell-${i}`}
                    aria-label={`${coord(i)}${tile ? `, letter ${tile.letter}, ${tile.value} points${tile.blank ? ", blank" : ""}${cell.staged ? ", staged" : ""}` : ", empty"}${bonus ? `, ${bonus === "NONE" ? "ordinary" : bonus}, ${tile ? "consumed" : "revealed"}` : ""}${i === cursor ? `, placement cursor ${direction}` : ""}${hasNote ? `, your note: ${noteDescription}` : ""}`}
                    className={`cell ${tile ? "occupied" : ""} ${cell.fresh ? "fresh" : ""} ${cell.staged ? "staged-tile" : ""} ${highlight ? "pair-highlight" : ""} ${i === cursor ? "placement-cursor" : ""} ${bonus ? "bonus-" + bonus : ""} ${showNote ? "has-guess" : ""} ${showBonus ? "has-observation" : ""}`}
                    onClick={() => onSquare(i)}
                  >
                    {i === cursor && !tile ? (
                      <span className="cursor-arrow" aria-hidden="true">
                        {direction === "across" ? "→" : "↓"}
                      </span>
                    ) : showNote ? (
                      <span className="square-guess" aria-hidden="true">
                        {guesses.length > 1 ? (
                          <>
                            <span className="guess-count">
                              {guesses.length}?
                            </span>
                            <span className="guess-alternatives">
                              {guesses.map((b) => (
                                <span key={b}>{bonusLabel(b)}</span>
                              ))}
                            </span>
                          </>
                        ) : guesses.length ? (
                          bonusLabel(guesses[0])
                        ) : (
                          "∅"
                        )}
                      </span>
                    ) : showBonus ? (
                      <span className="square-bonus" aria-hidden="true">
                        {bonusLabel(bonus)}
                      </span>
                    ) : tile && !notesMode ? (
                      <>
                        <span
                          aria-hidden="true"
                          className={`tile-letter ${tile.blank ? "blank-letter" : ""}`}
                        >
                          {tile.letter}
                        </span>
                        <sup className="tile-points" aria-hidden="true">
                          {tile.value}
                        </sup>
                      </>
                    ) : i === 112 ? (
                      <span className="center" aria-hidden="true">
                        {notesMode ? "—" : "✦"}
                      </span>
                    ) : null}
                    {notesMode && highlight && (
                      <span className="sr-only">Selected symmetric pair</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {(notesMode || enlarged) && (
        <p className="board-map-key">
          {notesMode && "Dashed: your guess · Solid: observed · —: ordinary"}
          {notesMode && enlarged && <br />}
          {enlarged &&
            "Swipe the board to explore. Fit board shows all squares."}
        </p>
      )}
    </div>
  );
}
