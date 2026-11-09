import { useState } from "react";
import type { CellView } from "../engine/game";
import { BONUSES } from "../engine/types";
import { coord, mirror } from "../engine/generator";

export function NotesDock({
  at,
  cell,
  onNote,
}: {
  at: number | null;
  cell?: CellView;
  onNote: (at: number, mask: number) => void;
}) {
  const [multiple, setMultiple] = useState(false);
  const mask = cell?.note ?? 31;
  return (
    <section className="annotation-dock" aria-label="Private notes">
      <div className="annotation-heading">
        <strong>
          {at === null
            ? "Your private notes"
            : `${coord(at)} ↔ ${coord(mirror(at))}`}
        </strong>
        <span>Mirrors automatically</span>
      </div>
      {at === null ? (
        <p>Tap any square to make a guess. Tap another to keep going.</p>
      ) : (
        <>
          <div className="square-readout">
            {cell?.tile && (
              <div className="readout-tile" aria-hidden="true">
                <span className={cell.tile.blank ? "blank-letter" : ""}>
                  {cell.tile.letter}
                </span>
                <sup>{cell.tile.value}</sup>
              </div>
            )}
            <div>
              <strong>
                {cell?.tile
                  ? `${cell.tile.letter} · ${cell.tile.value} ${cell.tile.value === 1 ? "point" : "points"}${cell.tile.blank ? " · blank" : ""}`
                  : "Empty square"}
              </strong>
              <p className="observation">
                {cell?.bonus
                  ? `Observed: ${cell.bonus === "NONE" ? "Ordinary" : cell.bonus}${cell.tile ? " · already used" : ""}`
                  : at === 112
                    ? "Ordinary center, by rule."
                    : "Bonus hidden · your guesses are not checked."}
              </p>
            </div>
          </div>
          {at === 112 ? (
            <p>The center is always ordinary.</p>
          ) : (
            <>
              <div className="quick-notes">
                {BONUSES.map((bonus, i) => (
                  <button
                    key={bonus}
                    aria-pressed={mask !== 31 && Boolean(mask & (1 << i))}
                    onClick={() =>
                      onNote(
                        at,
                        multiple
                          ? mask === 31
                            ? 1 << i
                            : mask ^ (1 << i)
                          : 1 << i,
                      )
                    }
                  >
                    {bonus === "NONE" ? "Ordinary" : bonus}
                  </button>
                ))}
              </div>
              <div className="annotation-options">
                <label>
                  <input
                    type="checkbox"
                    checked={multiple}
                    onChange={(e) => setMultiple(e.target.checked)}
                  />{" "}
                  Multiple possibilities
                </label>
                <button
                  aria-label="Reset to unknown"
                  onClick={() => onNote(at, 31)}
                >
                  Reset
                </button>
                <button onClick={() => onNote(at, 0)}>Clear hypothesis</button>
              </div>
              <div className="note-summary" role="status">
                {mask === 31
                  ? "No guess yet. Tap once to mark a bonus."
                  : mask === 0
                    ? "No possibilities selected."
                    : `Your guess: ${BONUSES.filter((_, i) => mask & (1 << i))
                        .map((b) => (b === "NONE" ? "Ordinary" : b))
                        .join(", ")}`}
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
