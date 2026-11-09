import { useEffect, useState, useSyncExternalStore } from "react";
import { controller, DEV_TOOLS } from "./controller";
import type { Mode, Placement, Player } from "./engine/types";
import { BONUSES } from "./engine/types";
import type { CellView, PlayerView } from "./engine/game";
import { coord, mirror } from "./engine/generator";
import { GameBoard } from "./components/GameBoard";
import { Dialog } from "./components/Dialog";

export default function App() {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    void controller.initialize();
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <main className={state.view ? "playing" : ""}>
      <header className="masthead">
        <div className="brand-mark" aria-hidden="true">
          V<span>W</span>
        </div>
        <div>
          <h1>Veiled Words</h1>
          <p>Words in plain sight. Bonuses in hiding.</p>
        </div>
      </header>
      <div className="save-status" role="status">
        {!online ? "Offline · " : ""}
        {state.busy
          ? "Saving…"
          : state.saved
            ? "Saved on this device"
            : state.loading
              ? "Loading saved game…"
              : "Two players · One device"}
      </div>
      {state.warning && (
        <aside role="alert" className="warning">
          {state.warning}
          <button onClick={() => void controller.export().catch(() => {})}>
            Export saved data
          </button>
        </aside>
      )}
      {state.error && (
        <p role="alert" className="error">
          {state.error}
        </p>
      )}
      {!state.loading &&
        (state.view ? (
          <GameScreen view={state.view} busy={state.busy} />
        ) : (
          <Setup hasSave={state.hasSave} busy={state.busy} />
        ))}
      <footer>15 × 15 · Rotational symmetry · No score previews</footer>
    </main>
  );
}
function Setup({ hasSave, busy }: { hasSave: boolean; busy: boolean }) {
  const [names, setNames] = useState(["Player 1", "Player 2"]);
  const [mode, setMode] = useState<Mode>("SCORE_ONLY");
  const [seed, setSeed] = useState("");
  const [fixture, setFixture] = useState("");
  const [confirm, setConfirm] = useState(false);
  const begin = () => void controller.newGame(names, mode, seed, fixture);
  return (
    <section className="setup panel">
      <p className="eyebrow">A WORD GAME WITH A SECRET</p>
      <h2>
        Find your next
        <br />
        <em>hidden advantage.</em>
      </h2>
      <p>
        Build connected words. Read the scores. Use symmetry to make your own
        deductions.
      </p>
      {hasSave && (
        <button
          className="primary full"
          onClick={() => void controller.resume()}
          disabled={busy}
        >
          Resume game
        </button>
      )}
      <div className="name-fields">
        {names.map((n, i) => (
          <label key={i}>
            Player {i + 1}
            <input
              maxLength={32}
              value={n}
              onChange={(e) =>
                setNames(names.map((v, j) => (j === i ? e.target.value : v)))
              }
            />
          </label>
        ))}
      </div>
      <fieldset>
        <legend>How will you uncover the board?</legend>
        <label
          className={`mode-choice ${mode === "SCORE_ONLY" ? "chosen" : ""}`}
        >
          <input
            type="radio"
            name="reveal"
            checked={mode === "SCORE_ONLY"}
            onChange={() => setMode("SCORE_ONLY")}
          />
          <span>
            <strong>Score-only</strong>
            <small>Only the turn total. Every bonus stays hidden.</small>
          </span>
        </label>
        <label
          className={`mode-choice ${mode === "REVEAL_USED" ? "chosen" : ""}`}
        >
          <input
            type="radio"
            name="reveal"
            checked={mode === "REVEAL_USED"}
            onChange={() => setMode("REVEAL_USED")}
          />
          <span>
            <strong>Reveal-used</strong>
            <small>Discover each square’s bonus when a tile is played.</small>
          </span>
        </label>
      </fieldset>
      {DEV_TOOLS && (
        <details className="dev">
          <summary>Developer fixtures</summary>
          <label>
            Seed
            <input value={seed} onChange={(e) => setSeed(e.target.value)} />
          </label>
          <label>
            Starting rack
            <select
              value={fixture}
              onChange={(e) => setFixture(e.target.value)}
            >
              <option value="">Natural draw</option>
              <option value="opening">Opening ATCERSN</option>
              <option value="blank">Blank ?TCERSN</option>
            </select>
          </label>
        </details>
      )}
      <button
        className="primary full"
        disabled={busy}
        onClick={() => (hasSave ? setConfirm(true) : begin())}
      >
        New game
      </button>
      <details>
        <summary>How to play & install</summary>
        <p>
          Start with a word crossing H8, the ordinary center. Select a rack
          tile, then a square. All new tiles must form a connected row or
          column. Submit to learn your turn total. Bonuses work once, on new
          tiles only; seven tiles earn 50 extra.
        </p>
        <p>
          Notes are your private guesses. Opposite squares match under a
          half-turn: A1 ↔ O15. Scores may allow several explanations. After each
          turn, pass the device through the privacy screen.
        </p>
        <p>
          After this page has loaded and the offline cache is ready, the game
          works without a connection. In Safari, Share → Add to Home Screen
          installs it. Pending tiles are not saved. Resume always asks who is
          holding the device.
        </p>
      </details>
      {confirm && (
        <Dialog title="Replace saved game?" onClose={() => setConfirm(false)}>
          <p>A new game will replace the game saved on this device.</p>
          <button
            className="danger"
            onClick={() => {
              setConfirm(false);
              begin();
            }}
          >
            Replace and start
          </button>
          <button onClick={() => setConfirm(false)}>Keep saved game</button>
        </Dialog>
      )}
    </section>
  );
}
function GameScreen({ view, busy }: { view: PlayerView; busy: boolean }) {
  const [pending, setPending] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [history, setHistory] = useState(false);
  const [historyTurn, setHistoryTurn] = useState<number | undefined>();
  const [compare, setCompare] = useState<Player | undefined>();
  const [sheet, setSheet] = useState<
    "inspect" | "notes" | "blank" | "pass" | "exchange" | "new" | null
  >(null);
  const [blankAt, setBlankAt] = useState<number | null>(null);
  const [exchange, setExchange] = useState<string[] | null>(null);
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const active = view.phase === "TURN";
  const displayed = controller.view(historyTurn, compare) ?? view;
  const rack = rackOrder.length
    ? [...view.rack].sort(
        (a, b) => rackOrder.indexOf(a.id) - rackOrder.indexOf(b.id),
      )
    : view.rack;
  const stage = (at: number, blankAs?: string) => {
    if (!selected) return;
    setPending((p) => [
      ...p.filter((v) => v.id !== selected && v.at !== at),
      { id: selected, at, ...(blankAs ? { blankAs } : {}) },
    ]);
    setSelected(null);
  };
  const clickSquare = (at: number) => {
    setSelectedCell(at);
    if (historyTurn !== undefined) {
      setSheet("inspect");
      return;
    }
    if (notesMode && active) {
      setSheet("notes");
      return;
    }
    if (!active || view.board[at].tile) {
      setSheet("inspect");
      return;
    }
    if (selected) {
      const tile = view.rack.find((t) => t.id === selected);
      if (tile?.kind === "BLANK") {
        setBlankAt(at);
        setSheet("blank");
      } else stage(at);
    } else if (pending.some((p) => p.at === at)) {
      setPending((p) => p.filter((v) => v.at !== at));
    } else setSheet("inspect");
  };
  const board: CellView[] = displayed.board.map((cell, i) => {
    if (!active || historyTurn !== undefined) return cell;
    const p = pending.find((p) => p.at === i);
    if (!p) return cell;
    const tile = view.rack.find((t) => t.id === p.id);
    if (!tile) return cell;
    return {
      ...cell,
      bonus: undefined,
      tile: {
        letter: p.blankAs ?? tile.kind,
        value: tile.value,
        blank: tile.kind === "BLANK",
      },
      fresh: true,
    };
  });
  const turnAction = async (type: "PASS" | "EXCHANGE") => {
    const ok = await controller.action(
      type === "PASS" ? { type } : { type, ids: exchange ?? [] },
    );
    if (ok) {
      setSheet(null);
      setSelected(null);
      setExchange(null);
      setSelectedCell(null);
    }
  };
  const closeSheet = () => {
    setSheet(null);
    setBlankAt(null);
  };
  const endText =
    view.scores[0] === view.scores[1]
      ? "A tie!"
      : `${view.names[view.scores[0] > view.scores[1] ? 0 : 1]} wins`;
  if (view.phase === "HANDOFF")
    return (
      <section className="gate panel">
        <div className="gate-icon" aria-hidden="true">
          ↔
        </div>
        <p className="eyebrow">YOUR WORDS CAN WAIT</p>
        <h2>
          Pass to
          <br />
          {view.names[view.active]}
        </h2>
        <p>
          Give them the device before continuing.
          <br />
          Their rack and notes are private.
        </p>
        <button
          className="primary full"
          disabled={busy}
          onClick={() => {
            setPending([]);
            setSelected(null);
            setSheet(null);
            setNotesMode(false);
            setHistory(false);
            setHistoryTurn(undefined);
            void controller.start();
          }}
        >
          I’m {view.names[view.active]} — Start turn
        </button>
      </section>
    );
  return (
    <>
      <section className="score-strip" aria-label="Scores">
        {view.names.map((name, i) => (
          <div key={i} className={i === view.active ? "current-player" : ""}>
            <span>
              {name}
              {i === view.active && active ? " · playing" : ""}
            </span>
            <strong>{view.scores[i]}</strong>
          </div>
        ))}
      </section>
      {view.phase === "OVER" ? (
        <section className="panel endgame">
          <p className="eyebrow">GAME OVER · FULL BOARD REVEALED</p>
          <h2>{endText}</h2>
          <p>
            {view.endReason === "RACK_OUT"
              ? "A player emptied their rack with an empty bag. Opponent rack values were transferred."
              : "Six consecutive scoreless turns. Each player’s remaining rack value was deducted."}{" "}
            Final scores include these adjustments.
          </p>
          <label>
            Compare private notes
            <select
              value={compare ?? ""}
              onChange={(e) =>
                setCompare(
                  e.target.value === ""
                    ? undefined
                    : (Number(e.target.value) as Player),
                )
              }
            >
              <option value="">No notes</option>
              {view.names.map((n, i) => (
                <option key={i} value={i}>
                  {n}’s notes
                </option>
              ))}
            </select>
          </label>
        </section>
      ) : (
        <div className="turn-line">
          <span>
            Turn {view.turn} · {view.bagCount} tiles in bag
          </span>
          <span className="mode-pill">
            {view.mode === "SCORE_ONLY" ? "Score-only" : "Reveal-used"}
          </span>
        </div>
      )}
      {view.phase === "RESULT" && view.result && (
        <section className="result panel" role="status">
          <p className="eyebrow">
            TURN RESULT · {view.names[view.result.player]}
          </p>
          <h2>
            +{view.result.total} <small>points</small>
          </h2>
          <p>Total: {view.scores[view.result.player]} points</p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              setPending([]);
              setSheet(null);
              setHistoryTurn(undefined);
              setHistory(false);
              void controller.handoff();
            }}
          >
            Pass device
          </button>
        </section>
      )}
      <nav className="toolbar" aria-label="Board tools">
        <div className="segments">
          <button
            aria-pressed={!notesMode}
            disabled={!active || historyTurn !== undefined}
            onClick={() => setNotesMode(false)}
          >
            Play
          </button>
          <button
            aria-pressed={notesMode}
            disabled={!active || historyTurn !== undefined}
            onClick={() => setNotesMode(true)}
          >
            Notes
          </button>
        </div>
        <button onClick={() => setHistory((v) => !v)} aria-expanded={history}>
          History <span>{view.history.length}</span>
        </button>
      </nav>
      {history && (
        <section className="history panel">
          <h2>Move history</h2>
          {!view.history.length && <p>No committed turns yet.</p>}
          {view.history.map((m) => (
            <button
              key={m.turn}
              className={historyTurn === m.turn ? "selected-history" : ""}
              onClick={() => {
                setHistoryTurn(m.turn);
                setSelectedCell(null);
                setSheet(null);
              }}
            >
              #{m.turn} {view.names[m.player]} ·{" "}
              {m.type === "PLAY"
                ? m.words.join(", ")
                : m.type === "PASS"
                  ? "Pass"
                  : `Exchange ${m.exchanged}`}{" "}
              <strong>{m.total} pts</strong>
            </button>
          ))}
        </section>
      )}
      {historyTurn !== undefined && (
        <div className="history-banner">
          Board after turn {historyTurn} · highlighted tiles were new
          <button
            onClick={() => {
              setHistoryTurn(undefined);
              setSelectedCell(null);
            }}
          >
            Return to live board
          </button>
        </div>
      )}
      <GameBoard
        board={board}
        selected={selectedCell}
        onSquare={clickSquare}
        notesMode={notesMode}
      />
      <p className="board-hint">
        {selectedCell !== null
          ? `${coord(selectedCell)} ↔ ${coord(mirror(selectedCell))} · `
          : ""}
        {historyTurn !== undefined
          ? "Read-only history"
          : notesMode
            ? "Tap a square to edit your private hypothesis."
            : selected
              ? "Tap an empty square to place your tile."
              : "H8 is ordinary. Tap a tile, then a square."}
      </p>
      {active && historyTurn === undefined && (
        <section className="rack-area" aria-label="Your rack">
          <div className="rack-heading">
            <span>{view.names[view.active]}’s rack</span>
            <button
              onClick={() =>
                setRackOrder(
                  [...view.rack]
                    .sort(
                      () =>
                        crypto.getRandomValues(new Uint8Array(1))[0] / 255 -
                        0.5,
                    )
                    .map((t) => t.id),
                )
              }
            >
              Shuffle
            </button>
          </div>
          <div className="rack">
            {rack.map((t) => {
              const staged = pending.some((p) => p.id === t.id);
              return (
                <button
                  key={t.id}
                  aria-label={`Rack ${t.kind === "BLANK" ? "blank" : t.kind}, ${t.value} points${staged ? ", staged" : ""}`}
                  aria-pressed={
                    exchange ? exchange.includes(t.id) : selected === t.id
                  }
                  className={`rack-tile ${staged ? "staged" : ""}`}
                  onClick={() => {
                    if (exchange)
                      setExchange((ids) =>
                        ids!.includes(t.id)
                          ? ids!.filter((id) => id !== t.id)
                          : [...ids!, t.id],
                      );
                    else setSelected(selected === t.id ? null : t.id);
                  }}
                >
                  <span aria-hidden="true">
                    {t.kind === "BLANK" ? "◇" : t.kind}
                  </span>{" "}
                  <sub aria-hidden="true">{t.value}</sub>
                </button>
              );
            })}
          </div>
          {exchange ? (
            <div className="action-row">
              <button
                className="primary"
                disabled={busy || !exchange.length}
                onClick={() => setSheet("exchange")}
              >
                Confirm exchange ({exchange.length})
              </button>
              <button onClick={() => setExchange(null)}>Cancel exchange</button>
            </div>
          ) : (
            <>
              <div className="action-row">
                <button
                  className="primary"
                  disabled={busy || !pending.length}
                  onClick={async () => {
                    if (
                      await controller.action({
                        type: "PLAY",
                        placements: pending,
                      })
                    ) {
                      setPending([]);
                      setSelected(null);
                      setSelectedCell(null);
                      setNotesMode(false);
                    }
                  }}
                >
                  Submit word
                </button>
                <button
                  disabled={!pending.length}
                  onClick={() => {
                    setPending([]);
                    setSelected(null);
                  }}
                >
                  Recall
                </button>
              </div>
              <div className="secondary-actions">
                <button
                  disabled={busy || pending.length > 0}
                  onClick={() => setSheet("pass")}
                >
                  Pass
                </button>
                <button
                  disabled={busy || pending.length > 0 || view.bagCount < 7}
                  onClick={() => {
                    setExchange([]);
                    setSelected(null);
                  }}
                >
                  Exchange
                </button>
              </div>
              {pending.length > 0 && (
                <small>
                  Recall staged tiles before passing or exchanging. Tap a staged
                  square to remove it, or select its rack tile to move it.
                </small>
              )}
            </>
          )}
        </section>
      )}
      {view.phase === "OVER" && (
        <div className="legend">
          Ordinary — · DL 2× letter · TL 3× letter · DW 2× word · TW 3× word
        </div>
      )}
      <button className="text-button" onClick={() => setSheet("new")}>
        Home / New game
      </button>
      {sheet === "inspect" && selectedCell !== null && (
        <Dialog
          title={`${coord(selectedCell)} ↔ ${coord(mirror(selectedCell))}`}
          onClose={closeSheet}
        >
          <div className="magnified">
            {board[selectedCell].tile?.letter ?? "·"}
            <sub>{board[selectedCell].tile?.value ?? ""}</sub>
          </div>
          <p>
            {displayed.board[selectedCell].bonus
              ? `${displayed.board[selectedCell].bonus === "NONE" ? "Ordinary" : displayed.board[selectedCell].bonus}${displayed.board[selectedCell].tile ? " · consumed (will not apply again)" : ""}`
              : selectedCell === 112
                ? "Ordinary center, by rule."
                : "Bonus hidden."}
          </p>
          {displayed.board[selectedCell].note !== undefined &&
            selectedCell !== 112 && (
              <p>
                {view.phase === "OVER" && compare !== undefined
                  ? view.names[compare] + "’s note"
                  : "Your note"}
                :{" "}
                {BONUSES.filter(
                  (_, i) =>
                    (displayed.board[selectedCell].note! & (1 << i)) !== 0,
                )
                  .map((b) => (b === "NONE" ? "Ordinary" : b))
                  .join(", ") || "No possibilities selected"}
                . This is a hypothesis.
              </p>
            )}
          {active && historyTurn === undefined && (
            <button
              onClick={() => {
                setNotesMode(true);
                setSheet("notes");
              }}
            >
              Edit private note
            </button>
          )}
        </Dialog>
      )}
      {sheet === "notes" && selectedCell !== null && (
        <Dialog
          title={`Your note · ${coord(selectedCell)} ↔ ${coord(mirror(selectedCell))}`}
          onClose={closeSheet}
        >
          <p>
            A private hypothesis, mirrored to the opposite square. These guesses
            are never checked.
          </p>
          {selectedCell === 112 ? (
            <p>H8 is locked ordinary by rule.</p>
          ) : (
            <>
              <div className="note-options">
                {BONUSES.map((bonus, i) => {
                  const mask = view.board[selectedCell].note ?? 31;
                  return (
                    <button
                      key={bonus}
                      aria-pressed={Boolean(mask & (1 << i))}
                      onClick={() =>
                        void controller.note(selectedCell, mask ^ (1 << i))
                      }
                    >
                      {bonus === "NONE" ? "Ordinary" : bonus}
                    </button>
                  );
                })}
              </div>
              {view.board[selectedCell].note === 0 && (
                <p className="warning">
                  Your note has no possibilities selected.
                </p>
              )}
              <button onClick={() => void controller.note(selectedCell, 31)}>
                Reset to unknown
              </button>
              <button onClick={() => void controller.note(selectedCell, 0)}>
                Clear hypothesis
              </button>
            </>
          )}
          <button className="primary full" onClick={closeSheet}>
            Done
          </button>
        </Dialog>
      )}
      {sheet === "blank" && (
        <Dialog title="Choose blank letter" onClose={closeSheet}>
          <p>The blank always scores zero.</p>
          <div className="alphabet">
            {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
              <button
                key={letter}
                onClick={() => {
                  if (blankAt !== null) stage(blankAt, letter);
                  closeSheet();
                }}
              >
                {letter}
              </button>
            ))}
          </div>
          <button onClick={closeSheet}>Cancel</button>
        </Dialog>
      )}
      {sheet === "pass" && (
        <Dialog title="Pass this turn?" onClose={closeSheet}>
          <p>
            No points will be scored. Six consecutive scoreless turns end the
            game.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void turnAction("PASS")}
          >
            Confirm pass
          </button>
          <button onClick={closeSheet}>Cancel</button>
        </Dialog>
      )}
      {sheet === "exchange" && (
        <Dialog title="Exchange selected tiles?" onClose={closeSheet}>
          <p>
            Exchange {exchange?.length} tile(s) and end your turn with zero
            points.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void turnAction("EXCHANGE")}
          >
            Exchange and end turn
          </button>
          <button onClick={closeSheet}>Cancel</button>
        </Dialog>
      )}
      {sheet === "new" && (
        <Dialog title="Return home?" onClose={closeSheet}>
          <p>
            Your committed game is saved. Pending placements will be discarded.
            A new game asks before replacing the save.
          </p>
          <button className="primary" onClick={() => controller.home()}>
            Return home
          </button>
          <button onClick={closeSheet}>Keep playing</button>
        </Dialog>
      )}
    </>
  );
}
