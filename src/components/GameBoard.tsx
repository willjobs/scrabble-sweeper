import type { CellView } from "../engine/game";
import { coord, mirror } from "../engine/generator";
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
  return (
    <div className="board-wrap">
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
            return (
              <button
                key={i}
                data-testid={`cell-${i}`}
                aria-label={`${coord(i)}${tile ? `, letter ${tile.letter}, ${tile.value} points${tile.blank ? ", blank" : ""}${cell.staged ? ", staged" : ""}` : ", empty"}${bonus ? `, ${bonus === "NONE" ? "ordinary" : bonus}, ${tile ? "consumed" : "revealed"}` : ""}${i === cursor ? `, placement cursor ${direction}` : ""}${i !== 112 && cell.note !== undefined && cell.note !== 31 ? ", your note" : ""}`}
                className={`cell ${tile ? "occupied" : ""} ${cell.fresh ? "fresh" : ""} ${cell.staged ? "staged-tile" : ""} ${highlight ? "pair-highlight" : ""} ${i === cursor ? "placement-cursor" : ""} ${bonus ? "bonus-" + bonus : ""}`}
                onClick={() => onSquare(i)}
              >
                {i === cursor && !tile && (
                  <span className="cursor-arrow" aria-hidden="true">
                    {direction === "across" ? "→" : "↓"}
                  </span>
                )}
                {tile ? (
                  <>
                    <span
                      aria-hidden="true"
                      className={tile.blank ? "blank-letter" : ""}
                    >
                      {tile.letter}
                    </span>{" "}
                    <sub aria-hidden="true">{tile.value}</sub>
                  </>
                ) : i === 112 && cursor !== i ? (
                  <span className="center">✦</span>
                ) : bonus && bonus !== "NONE" ? (
                  <small>{bonus}</small>
                ) : null}
                {tile && bonus && (
                  <small aria-hidden="true" className="consumed-marker">
                    {bonus === "NONE" ? "—" : bonus}
                  </small>
                )}
                {i !== 112 && cell.note !== undefined && cell.note !== 31 && (
                  <span className="note-dot" aria-hidden="true">
                    {cell.note === 0 ? "!" : "?"}
                  </span>
                )}
                {notesMode && highlight && (
                  <span className="sr-only">Selected symmetric pair</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
