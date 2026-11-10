import { useState } from "react";
import type { CellView } from "../engine/game";
import { BONUSES } from "../engine/types";
import { coord, mirror } from "../engine/generator";
import { Dialog } from "./Dialog";

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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const mask = cell?.note ?? 31;
  const locked = at === null || at === 112;
  const observation = cell?.bonus
    ? `Observed: ${cell.bonus === "NONE" ? "Ordinary" : cell.bonus}${cell.tile ? " · already used" : ""}`
    : at === 112
      ? "Ordinary center, by rule."
      : "Bonus hidden · your guesses are not checked.";
  const summary =
    at === null
      ? "Tap any square to make a guess."
      : at === 112
        ? "The center is always ordinary."
        : mask === 31
          ? "No guess yet. Tap once to mark a bonus."
          : mask === 0
            ? "No possibilities selected."
            : `Your guess: ${BONUSES.filter((_, i) => mask & (1 << i))
                .map((b) => (b === "NONE" ? "Ordinary" : b))
                .join(", ")}`;
  const readout =
    at === null ? (
      <p>Tap any square to make a guess. Tap another to keep going.</p>
    ) : (
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
            <span
              className={cell?.bonus ? "observed-label" : ""}
              data-premium={cell?.bonus}
            >
              {observation}
            </span>
          </p>
        </div>
      </div>
    );
  const reset = (value: number) => {
    if (!locked) onNote(at!, value);
    setDetailsOpen(false);
  };
  return (
    <section className="annotation-dock" aria-label="Private notes">
      <div className="annotation-heading">
        <div>
          <strong>
            {at === null
              ? "Your private notes"
              : `${coord(at)} ↔ ${coord(mirror(at))}`}
          </strong>
          <span className="mobile-note-context">
            {at === null
              ? "Tap a square to make a guess"
              : at === 112
                ? "Ordinary center · locked"
                : `${cell?.tile ? `${cell.tile.letter} · ${cell.tile.value} pt${cell.tile.blank ? " · blank" : ""}` : "Empty square"} · ${cell?.bonus ? `Observed ${cell.bonus === "NONE" ? "ordinary" : cell.bonus}` : "Hidden bonus"}`}
          </span>
        </div>
        <span className="mirror-caption">Mirrors automatically</span>
        <button
          className="note-options-trigger"
          aria-label="Note options"
          onClick={() => setDetailsOpen(true)}
        >
          Options
        </button>
      </div>
      <div className="desktop-note-readout">{readout}</div>
      <div className="quick-notes">
        {BONUSES.map((bonus, i) => (
          <button
            key={bonus}
            data-premium={bonus}
            title={
              bonus === "NONE"
                ? "Ordinary"
                : `${bonus[0] === "D" ? "Double" : "Triple"} ${bonus[1] === "L" ? "letter" : "word"}`
            }
            disabled={locked}
            aria-pressed={
              at !== null && mask !== 31 && Boolean(mask & (1 << i))
            }
            onClick={() =>
              onNote(
                at!,
                multiple ? (mask === 31 ? 1 << i : mask ^ (1 << i)) : 1 << i,
              )
            }
          >
            {bonus === "NONE" ? "Ordinary" : bonus}
          </button>
        ))}
      </div>
      <div className="annotation-options">
        <label className="multiple-notes-toggle">
          <input
            type="checkbox"
            aria-label="Multiple possibilities"
            checked={multiple}
            disabled={locked}
            onChange={(e) => setMultiple(e.target.checked)}
          />
          <span className="multiple-full-label">Multiple possibilities</span>
          <span className="multiple-short-label" aria-hidden="true">
            Multi
          </span>
        </label>
        <button
          aria-label="Reset to unknown"
          disabled={locked}
          onClick={() => reset(31)}
        >
          Reset
        </button>
        <button disabled={locked} onClick={() => reset(0)}>
          Clear hypothesis
        </button>
      </div>
      <div className="note-summary" role="status">
        {summary}
      </div>
      {detailsOpen && (
        <Dialog title="Note options" onClose={() => setDetailsOpen(false)}>
          {at !== null && (
            <p className="note-pair">
              {coord(at)} ↔ {coord(mirror(at))} · mirrors automatically
            </p>
          )}
          {readout}
          <p>{summary}</p>
          {!locked && (
            <div className="note-detail-actions">
              <button aria-label="Reset to unknown" onClick={() => reset(31)}>
                Reset to unknown
              </button>
              <button onClick={() => reset(0)}>Clear hypothesis</button>
            </div>
          )}
          <p>
            Tap a bonus to make a guess. Turn on Multi to keep several
            possibilities. Your guesses mirror to the opposite square.
          </p>
          <div className="bonus-color-key">
            {BONUSES.filter((b) => b !== "NONE").map((b) => (
              <span key={b} data-premium={b}>
                {b} · {b[0] === "D" ? "double" : "triple"}{" "}
                {b[1] === "L" ? "letter" : "word"}
              </span>
            ))}
          </div>
          <p>
            Dashed squares are your guesses. Solid squares are observed bonuses.
            Colors identify the bonus type; they do not confirm a guess.
          </p>
        </Dialog>
      )}
    </section>
  );
}
