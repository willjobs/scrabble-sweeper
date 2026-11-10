import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { controller, DEV_TOOLS } from "./controller";
import type { Mode, Placement, Player } from "./engine/types";
import { BONUSES } from "./engine/types";
import type { CellView, PlayerView } from "./engine/game";
import { coord, mirror } from "./engine/generator";
import { GameBoard } from "./components/GameBoard";
import { Dialog } from "./components/Dialog";
import { NotesDock } from "./components/NotesDock";
import { useAppUpdates } from "./useAppUpdates";
import { useTileDrag } from "./useTileDrag";

function ActionIcon({
  kind,
}: {
  kind: "across" | "down" | "shuffle" | "undo" | "recall";
}) {
  const paths = {
    across: "M4 12h16m-6-6 6 6-6 6",
    down: "M12 4v16m-6-6 6 6 6-6",
    shuffle:
      "M3 6h3c5 0 7 12 12 12h3m-4-4 4 4-4 4M3 18h3c2 0 3-2 4-4m4-4c1-2 2-4 4-4h3m-4-4 4 4-4 4",
    undo: "M8 7H3V2m0 5c5-6 17-3 17 5v7",
    recall: "M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6",
  };
  return (
    <svg
      className="action-icon"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[kind]} />
    </svg>
  );
}

export default function App() {
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
  );
  const [online, setOnline] = useState(navigator.onLine);
  const [statusOpen, setStatusOpen] = useState(false);
  const statusReturnFocus = useRef<HTMLElement | null>(null);
  const openStatus = (returnFocus: HTMLElement) => {
    statusReturnFocus.current = returnFocus;
    setStatusOpen(true);
  };
  const updates = useAppUpdates();
  const canReload = !state.busy && (!state.view || state.saved);
  useEffect(() => {
    window.dispatchEvent(new Event("tile-theory:ready"));
    void controller.initialize();
    let warmFrame = 0;
    const paintFrame = requestAnimationFrame(() => {
      warmFrame = requestAnimationFrame(() => controller.prepareDictionary());
    });
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      cancelAnimationFrame(paintFrame);
      cancelAnimationFrame(warmFrame);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <main className={state.view ? "playing" : "home"}>
      <header className="masthead">
        <div className="brand-mark" aria-hidden="true">
          T
        </div>
        <div>
          <h1>Tile Theory</h1>
          <p>A game of words & deduction.</p>
        </div>
      </header>
      <div className="save-status" role="status">
        <span className="save-label">
          {!online ? "Offline · " : ""}
          {state.busy
            ? "Saving…"
            : state.saved
              ? "Saved on this device"
              : state.loading
                ? "Loading saved game…"
                : "Two players · One device"}
        </span>
        {state.view && (
          <span className="mobile-game-meta">
            Turn {state.view.turn} · {state.view.bagCount} tiles in bag
          </span>
        )}
      </div>
      {(updates.available || updates.loadFailure) && (
        <aside className="update-notice" role="status">
          <strong>
            {updates.loadFailure
              ? "Some game files couldn’t load."
              : "A new version is ready."}
          </strong>
          <p>
            Saved turns and notes are kept. Unsubmitted tiles will be recalled.
          </p>
          <button disabled={!canReload} onClick={() => void updates.reload()}>
            Reload & update
          </button>
          {!canReload && <p>Wait for your game to save before reloading.</p>}
        </aside>
      )}
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
          <GameScreen
            view={state.view}
            busy={state.busy}
            saved={state.saved}
            onAppStatus={openStatus}
          />
        ) : (
          <Setup hasSave={state.hasSave} busy={state.busy} />
        ))}
      <footer>
        <span>
          {state.view
            ? "Every word builds a theory."
            : "A little wordplay. A little deduction."}
        </span>
        <button
          className="app-status-launcher"
          aria-label="App status & updates"
          title="App status & updates"
          onClick={(event) => openStatus(event.currentTarget)}
        >
          <span aria-hidden="true">ⓘ</span>
        </button>
      </footer>
      {statusOpen && (
        <Dialog
          title="App status & updates"
          onClose={() => {
            setStatusOpen(false);
            requestAnimationFrame(() => statusReturnFocus.current?.focus());
          }}
        >
          <div className="app-status">
            <p>
              Build {__APP_BUILD__.slice(0, 7)} ·{" "}
              {online ? "Online" : "Offline"}
            </p>
            <button
              disabled={updates.checking}
              onClick={() => void updates.check()}
            >
              {updates.checking ? "Checking…" : "Check for updates"}
            </button>{" "}
            <button
              disabled={!canReload || !online}
              onClick={() => void window.tileTheoryReload()}
            >
              Refresh app
            </button>
            <p>
              {updates.status ||
                "Refreshing keeps saved games. Unsubmitted tiles will be recalled."}
            </p>
            {!canReload && <p>Wait for your game to save before refreshing.</p>}
          </div>
        </Dialog>
      )}
    </main>
  );
}
function Setup({ hasSave, busy }: { hasSave: boolean; busy: boolean }) {
  const [names, setNames] = useState(["Player 1", "Player 2"]);
  const [mode, setMode] = useState<Mode>("SCORE_ONLY");
  const [seed, setSeed] = useState("");
  const [fixture, setFixture] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [options, setOptions] = useState<"players" | "help" | null>(null);
  const begin = () => void controller.newGame(names, mode, seed, fixture);
  const newGameButton = (
    <button
      className={`primary full new-start ${hasSave ? "with-save" : ""}`}
      disabled={busy}
      onClick={() => (hasSave ? setConfirm(true) : begin())}
    >
      New game
    </button>
  );
  return (
    <section className="setup">
      <div className="game-cover">
        <div className="cover-label">A PASS-AND-PLAY WORD GAME</div>
        <h2>
          Good words.
          <br />
          <em>Sneaky bonuses.</em>
        </h2>
        <div className="cover-art" aria-hidden="true">
          <div className="cover-board">
            {Array.from({ length: 30 }, (_, i) => {
              const letters: Record<number, string> = {
                7: "P",
                8: "L",
                9: "A",
                10: "Y",
                16: "E",
                22: "S",
              };
              return (
                <span
                  key={i}
                  className={
                    letters[i] ? "cover-tile" : i === 19 ? "cover-secret" : ""
                  }
                >
                  {letters[i] ?? (i === 19 ? "?" : "")}
                </span>
              );
            })}
          </div>
          <span className="floating-secret">?</span>
        </div>
        <p>
          Play your words. Uncover hidden bonuses.
          <br />
          Keep your next move a little mysterious.
        </p>
      </div>
      <div className="setup-controls">
        <div className="setup-heading">
          <span className="eyebrow">THE TABLE IS YOURS</span>
          <h3>A little friendly intrigue.</h3>
        </div>
        <div className="setup-start">
          {hasSave && (
            <button
              className="primary full"
              onClick={() => void controller.resume()}
              disabled={busy}
            >
              Resume game
            </button>
          )}
          {!hasSave && newGameButton}
        </div>
        <fieldset>
          <legend>Pick your mode</legend>
          <label
            className={`mode-choice ${mode === "SCORE_ONLY" ? "chosen" : ""}`}
          >
            <input
              type="radio"
              name="reveal"
              checked={mode === "SCORE_ONLY"}
              onChange={() => setMode("SCORE_ONLY")}
            />
            <span className="mode-icon" aria-hidden="true">
              ?
            </span>
            <span>
              <strong>Score-only</strong>
              <small>Bonuses stay hidden.</small>
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
            <span className="mode-icon" aria-hidden="true">
              ✦
            </span>
            <span>
              <strong>Reveal-used</strong>
              <small>Reveal played bonuses.</small>
            </span>
          </label>
        </fieldset>
        <div className="setup-links">
          <button onClick={() => setOptions("players")}>Who’s playing?</button>
          <button onClick={() => setOptions("help")}>
            How to play & install
          </button>
          {hasSave && newGameButton}
        </div>
      </div>
      {options === "players" && (
        <Dialog title="Who’s playing?" onClose={() => setOptions(null)}>
          <p>
            Two players, one device. Add your names, or keep Player 1 and Player
            2.
          </p>
          <div className="name-fields">
            {names.map((n, i) => (
              <label key={i}>
                Player {i + 1}
                <input
                  maxLength={32}
                  value={n}
                  onChange={(e) =>
                    setNames(
                      names.map((v, j) => (j === i ? e.target.value : v)),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <button className="primary full" onClick={() => setOptions(null)}>
            Done
          </button>
        </Dialog>
      )}
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
      {options === "help" && (
        <Dialog title="How to play & install" onClose={() => setOptions(null)}>
          <p>
            Start with a word crossing H8, the ordinary center. Tap a starting
            square, then tap your rack letters, or drag letters onto the board.
            Drag staged tiles to move them or return them to your rack. The
            cursor advances across or down. All new tiles must form a connected
            row or column. Submit to learn your turn total. Bonuses work once,
            on new tiles only; seven tiles earn 50 extra.
          </p>
          <p>
            Notes are your private guesses. Opposite squares match under a
            half-turn: A1 ↔ O15. Scores may allow several explanations. After
            each turn, use the score and revealed squares to keep making private
            notes. Tap another square to keep going; only Pass device ends your
            access.
          </p>
          <p>
            After this page has loaded and the offline cache is ready, the game
            works without a connection. In Safari, Share → Add to Home Screen
            installs it. Pending tiles are not saved. Resume always asks who is
            holding the device.
          </p>
        </Dialog>
      )}
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
function GameScreen({
  view,
  busy,
  saved,
  onAppStatus,
}: {
  view: PlayerView;
  busy: boolean;
  saved: boolean;
  onAppStatus: (returnFocus: HTMLElement) => void;
}) {
  const moreTrigger = useRef<HTMLButtonElement>(null);
  const [pending, setPending] = useState<Placement[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [history, setHistory] = useState(false);
  const [historyTurn, setHistoryTurn] = useState<number | undefined>();
  const [compare, setCompare] = useState<Player | undefined>();
  const [sheet, setSheet] = useState<
    "inspect" | "blank" | "pass" | "exchange" | "new" | "more" | null
  >(null);
  const [blankAt, setBlankAt] = useState<number | null>(null);
  const [exchange, setExchange] = useState<string[] | null>(null);
  const [rackOrder, setRackOrder] = useState<string[]>([]);
  const active = view.phase === "TURN";
  const canNote = active || view.phase === "RESULT";
  const [cursor, setCursor] = useState<number | null>(null);
  const [direction, setDirection] = useState<"across" | "down">("across");
  const [anchor, setAnchor] = useState<number | null>(null);
  const [boardZoom, setBoardZoom] = useState({
    enlarged: false,
    center: null as number | null,
  });
  const [undoStack, setUndoStack] = useState<Placement[][]>([]);
  const changePending = (next: Placement[]) => {
    controller.clearError();
    setUndoStack((stack) => [...stack, pending]);
    setPending(next);
  };
  const nextSquare = (
    at: number,
    axis: typeof direction,
    placed: Placement[],
  ) => {
    for (
      let i = at + (axis === "across" ? 1 : 15);
      i < 225;
      i += axis === "across" ? 1 : 15
    ) {
      if (axis === "across" && Math.floor(i / 15) !== Math.floor(at / 15))
        break;
      if (!view.board[i].tile && !placed.some((p) => p.at === i)) return i;
    }
    return null;
  };
  const displayed = controller.view(historyTurn, compare) ?? view;
  const changeDirection = (axis: typeof direction) => {
    setDirection(axis);
    if (anchor !== null) setCursor(nextSquare(anchor, axis, pending));
  };
  const shuffleRack = () =>
    setRackOrder(
      [...view.rack]
        .sort(() => crypto.getRandomValues(new Uint8Array(1))[0] / 255 - 0.5)
        .map((t) => t.id),
    );
  const rack = rackOrder.length
    ? [...view.rack].sort(
        (a, b) => rackOrder.indexOf(a.id) - rackOrder.indexOf(b.id),
      )
    : view.rack;
  const stage = (at: number, blankAs?: string) => {
    if (!selected || busy) return;
    const next = [
      ...pending.filter((v) => v.id !== selected && v.at !== at),
      { id: selected, at, ...(blankAs ? { blankAs } : {}) },
    ];
    changePending(next);
    setSelected(null);
    setAnchor(at);
    setCursor(nextSquare(at, direction, next));
    setBoardZoom({ enlarged: true, center: at });
  };
  const placeTile = (id: string, at: number) => {
    if (busy) return;
    const tile = view.rack.find((t) => t.id === id);
    if (!tile) return;
    const assignment = pending.find((p) => p.id === id)?.blankAs;
    if (tile.kind === "BLANK" && !assignment) {
      setSelected(id);
      setBlankAt(at);
      setSheet("blank");
      return;
    }
    const next = [
      ...pending.filter((p) => p.id !== id && p.at !== at),
      { id, at, ...(assignment ? { blankAs: assignment } : {}) },
    ];
    changePending(next);
    setSelected(null);
    setAnchor(at);
    setCursor(nextSquare(at, direction, next));
    setBoardZoom({ enlarged: true, center: at });
  };
  const clickSquare = (at: number) => {
    if (busy) return;
    setSelectedCell(at);
    if (historyTurn !== undefined || view.phase === "OVER") {
      setSheet("inspect");
      return;
    }
    if (notesMode && canNote) return;
    if (view.board[at].tile || !active) {
      setSelected(null);
      setNotesMode(true);
      return;
    }
    if (selected) {
      placeTile(selected, at);
      return;
    }
    const staged = pending.find((p) => p.at === at);
    if (staged) {
      setSelected(staged.id);
      setCursor(null);
      return;
    }
    setCursor(at);
    setAnchor(null);
  };
  const board: (CellView & { staged?: boolean })[] = displayed.board.map(
    (cell, i) => {
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
        staged: true,
      };
    },
  );
  const drag = useTileDrag({
    enabled:
      active &&
      !notesMode &&
      !history &&
      historyTurn === undefined &&
      exchange === null &&
      sheet === null &&
      !busy,
    canDrop: (id, at) =>
      !view.board[at].tile && !pending.some((p) => p.at === at && p.id !== id),
    isStaged: (id) => pending.some((p) => p.id === id),
    onDrop: (id, at) => {
      if (!pending.some((p) => p.id === id && p.at === at)) placeTile(id, at);
    },
    onRecall: (id) => {
      const placed = pending.find((p) => p.id === id);
      if (!placed) return;
      changePending(pending.filter((p) => p.id !== id));
      setSelected(null);
      setAnchor(null);
      setCursor(placed.at);
    },
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
          <span>{view.active + 1}</span>
          <i>✦</i>
        </div>
        <p className="eyebrow">NEXT UP. NEW POSSIBILITIES.</p>
        <h2>
          {view.resumeResult ? "Review your turn," : "Your move,"}
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
            setUndoStack([]);
            setCursor(null);
            setAnchor(null);
            setBoardZoom({ enlarged: false, center: null });
            setDirection("across");
            setSelectedCell(null);
            setSelected(null);
            setSheet(null);
            setNotesMode(false);
            setHistory(false);
            setHistoryTurn(undefined);
            void controller.start();
          }}
        >
          I’m {view.names[view.active]} —{" "}
          {view.resumeResult ? "Review turn result" : "Start turn"}
        </button>
      </section>
    );
  return (
    <section
      className={`game-table phase-${view.phase.toLowerCase()} ${notesMode && canNote && historyTurn === undefined ? "is-noting" : ""}`}
      aria-label="Game table"
    >
      <section className="score-strip" aria-label="Scores">
        {view.names.map((name, i) => (
          <div
            key={i}
            className={
              view.phase === "OVER"
                ? view.scores[i] > view.scores[1 - i]
                  ? "winning-player"
                  : ""
                : i === view.active
                  ? "current-player"
                  : ""
            }
          >
            <span className="player-number" aria-hidden="true">
              {i + 1}
            </span>
            <span className="player-name">
              {name}
              <small>
                {i === view.active && active ? "Your turn" : "Points"}
              </small>
            </span>
            <strong>{view.scores[i]}</strong>
          </div>
        ))}
      </section>
      {view.phase === "OVER" ? (
        <section className="panel endgame">
          <p className="eyebrow">GAME OVER · FULL BOARD REVEALED</p>
          <div className="end-sparkles" aria-hidden="true">
            ✦ <span>W</span> ✦
          </div>
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
            {view.result.total > 0
              ? "WELL PLAYED!"
              : "NEXT TURN, NEW POSSIBILITIES"}{" "}
            · {view.names[view.result.player]}
          </p>
          <h2>
            +{view.result.total} <small>points</small>
          </h2>
          <p>Total: {view.scores[view.result.player]} points</p>
          <p className="result-invitation">
            Your notes stay private until you pass.
          </p>
          {view.phase === "RESULT" && historyTurn === undefined && (
            <div className="result-actions">
              {" "}
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
            </div>
          )}
        </section>
      )}
      <nav className="toolbar" aria-label="Board tools">
        <div className="segments">
          <button
            aria-pressed={!notesMode}
            disabled={!canNote || historyTurn !== undefined}
            onClick={() => {
              setNotesMode(false);
              setSelected(null);
            }}
          >
            {active ? "Play" : "Board"}
          </button>
          <button
            aria-pressed={notesMode}
            disabled={!canNote || historyTurn !== undefined}
            onClick={() => {
              setNotesMode(true);
              setSelected(null);
            }}
          >
            Notes
          </button>
        </div>
        <button
          className="history-trigger"
          onClick={() => setHistory((v) => !v)}
          aria-expanded={history}
        >
          <span className="history-icon" aria-hidden="true">
            ◷
          </span>
          <span className="history-label">History</span>{" "}
          <span>{view.history.length}</span>
        </button>
        <button
          ref={moreTrigger}
          className="more-trigger"
          onClick={() => setSheet("more")}
        >
          More
        </button>
        <button
          className="mobile-zoom"
          aria-pressed={boardZoom.enlarged}
          onClick={() =>
            setBoardZoom({ enlarged: !boardZoom.enlarged, center: null })
          }
        >
          {boardZoom.enlarged ? "Fit board" : "Enlarge ⤢"}
        </button>
      </nav>
      {history && (
        <Dialog title="Move history" onClose={() => setHistory(false)}>
          <section className="history">
            {!view.history.length && <p>No committed turns yet.</p>}
            {view.history.map((m) => (
              <button
                key={m.turn}
                className={historyTurn === m.turn ? "selected-history" : ""}
                onClick={() => {
                  setHistoryTurn(m.turn);
                  setSelectedCell(null);
                  setSheet(null);
                  setHistory(false);
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
        </Dialog>
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
      <div
        className={`board-workspace ${notesMode && canNote && historyTurn === undefined ? "with-notes" : ""}`}
      >
        <div className="board-column">
          <GameBoard
            board={board}
            zoom={boardZoom}
            onZoomChange={(enlarged) =>
              setBoardZoom({ enlarged, center: null })
            }
            onClickCapture={drag.suppressClick}
            onTilePointerDown={(event, at) => {
              const placed = pending.find((p) => p.at === at);
              const tile = board[at].tile;
              if (placed && tile) drag.begin(event, { id: placed.id, ...tile });
            }}
            dragSource={
              drag.tile
                ? (pending.find((p) => p.id === drag.tile!.id)?.at ?? null)
                : null
            }
            dropTarget={drag.target?.kind === "board" ? drag.target.at : null}
            dropAllowed={drag.target?.valid ?? false}
            dragPreview={drag.tile}
            selected={
              notesMode
                ? selectedCell
                : (pending.find((p) => p.id === selected)?.at ?? null)
            }
            onSquare={clickSquare}
            notesMode={notesMode}
            cursor={
              active &&
              !notesMode &&
              historyTurn === undefined &&
              exchange === null
                ? cursor
                : null
            }
            direction={direction}
          />
          <p className="board-hint">
            {selectedCell !== null
              ? `${coord(selectedCell)} ↔ ${coord(mirror(selectedCell))} · `
              : ""}
            {historyTurn !== undefined
              ? "Read-only history"
              : notesMode
                ? "Tap squares to keep making notes. No need to close the editor."
                : selected
                  ? "Tap a destination to move this tile."
                  : cursor !== null
                    ? `${coord(cursor)} · tap your next rack letter (${direction}).`
                    : "Drag a tile onto the board, or tap a square then your letters. H8 is ordinary."}
          </p>
        </div>
        {canNote && notesMode && historyTurn === undefined && (
          <NotesDock
            at={selectedCell}
            cell={selectedCell === null ? undefined : board[selectedCell]}
            onNote={(at, mask) => void controller.note(at, mask)}
          />
        )}
      </div>
      {active && !notesMode && historyTurn === undefined && (
        <section
          className="rack-area"
          aria-label="Your rack"
          onClickCapture={drag.suppressClick}
        >
          <div className="rack-heading">
            <div className="placement-tools" aria-label="Placement controls">
              <div>
                <button
                  aria-pressed={direction === "across"}
                  onClick={() => changeDirection("across")}
                >
                  Across →
                </button>
                <button
                  aria-pressed={direction === "down"}
                  onClick={() => changeDirection("down")}
                >
                  Down ↓
                </button>
              </div>
              {selected && pending.some((p) => p.id === selected) && (
                <button
                  onClick={() => {
                    changePending(pending.filter((p) => p.id !== selected));
                    setSelected(null);
                  }}
                >
                  Remove tile
                </button>
              )}
            </div>
            <button onClick={shuffleRack}>Shuffle</button>
          </div>
          <div
            className={`rack ${drag.target?.kind === "rack" && drag.target.valid ? "rack-drop-target" : ""}`}
            data-drop-rack
          >
            {rack.map((t) => {
              const staged = pending.some((p) => p.id === t.id);
              return (
                <button
                  key={t.id}
                  aria-label={`Rack ${t.kind === "BLANK" ? "blank" : t.kind}, ${t.value} points${staged ? ", staged" : ""}`}
                  aria-pressed={
                    exchange ? exchange.includes(t.id) : selected === t.id
                  }
                  className={`rack-tile ${staged ? "staged" : ""} ${drag.tile?.id === t.id ? "drag-origin" : ""}`}
                  draggable={false}
                  onPointerDown={(event) =>
                    drag.begin(event, {
                      id: t.id,
                      letter:
                        pending.find((p) => p.id === t.id)?.blankAs ??
                        (t.kind === "BLANK" ? "◇" : t.kind),
                      value: t.value,
                      blank: t.kind === "BLANK",
                    })
                  }
                  onClick={() => {
                    if (exchange)
                      setExchange((ids) =>
                        ids!.includes(t.id)
                          ? ids!.filter((id) => id !== t.id)
                          : [...ids!, t.id],
                      );
                    else if (busy) return;
                    else if (pending.some((p) => p.id === t.id))
                      setSelected(selected === t.id ? null : t.id);
                    else if (cursor !== null) placeTile(t.id, cursor);
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
                  className="mobile-tool direction-action"
                  aria-label={`Direction: ${direction === "across" ? "Across →" : "Down ↓"}`}
                  title="Tap to change placement direction"
                  onClick={() =>
                    changeDirection(direction === "across" ? "down" : "across")
                  }
                >
                  <ActionIcon kind={direction} />
                  <span>{direction === "across" ? "Across" : "Down"}</span>
                </button>
                <button
                  className="mobile-tool shuffle-action"
                  onClick={shuffleRack}
                >
                  <ActionIcon kind="shuffle" />
                  <span>Shuffle</span>
                </button>
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
                      setUndoStack([]);
                      setCursor(null);
                      setAnchor(null);
                      setSelected(null);
                      setSelectedCell(
                        pending.find((p) => p.at !== 112)?.at ??
                          pending[0]?.at ??
                          null,
                      );
                      setNotesMode(true);
                    }
                  }}
                >
                  Submit word
                </button>
                <button
                  className="undo-action"
                  disabled={!undoStack.length || busy}
                  onClick={() => {
                    controller.clearError();
                    setPending(undoStack.at(-1)!);
                    setUndoStack((stack) => stack.slice(0, -1));
                    setSelected(null);
                    setCursor(null);
                    setAnchor(null);
                  }}
                >
                  <ActionIcon kind="undo" />
                  <span>Undo</span>
                </button>
                <button
                  className="recall-action"
                  disabled={!pending.length || busy}
                  onClick={() => {
                    changePending([]);
                    setCursor(null);
                    setAnchor(null);
                    setSelected(null);
                  }}
                >
                  <ActionIcon kind="recall" />
                  <span>Recall</span>
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {view.phase === "OVER" && (
        <div className="legend">
          Ordinary — · DL 2× letter · TL 3× letter · DW 2× word · TW 3× word
        </div>
      )}
      {sheet === "more" && (
        <Dialog title="Game menu" onClose={closeSheet}>
          <p>
            Turn {view.turn} · {view.bagCount} tiles in bag ·{" "}
            {view.mode === "SCORE_ONLY" ? "Score-only" : "Reveal-used"}
          </p>
          <div className="game-menu-actions">
            {selected && pending.some((p) => p.id === selected) && (
              <button
                onClick={() => {
                  changePending(pending.filter((p) => p.id !== selected));
                  setSelected(null);
                  closeSheet();
                }}
              >
                Remove tile
              </button>
            )}
            {active && historyTurn === undefined && (
              <>
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
                    closeSheet();
                    setNotesMode(false);
                    setHistoryTurn(undefined);
                  }}
                >
                  Exchange
                </button>
              </>
            )}
            <button onClick={() => setSheet("new")}>Home / New game</button>
            <button
              onClick={() => {
                closeSheet();
                onAppStatus(moreTrigger.current!);
              }}
            >
              App status & updates
            </button>
          </div>
          <p>
            Drag or tap to place tiles. Tap a staged tile to move it or remove
            it. Undo reverses your last change; Recall returns the whole pending
            word.
          </p>
          {pending.length > 0 && (
            <p>Recall staged tiles before passing or exchanging.</p>
          )}
          <p>
            Use Notes to mark private guesses. You can keep making notes after
            submitting, until you pass the device.
          </p>
        </Dialog>
      )}
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
          {canNote && historyTurn === undefined && (
            <button
              onClick={() => {
                setNotesMode(true);
                setSheet(null);
              }}
            >
              Edit private note
            </button>
          )}
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
            {saved
              ? "Your committed game is saved."
              : "Your latest game is only in memory. Closing the app may lose progress."}{" "}
            Pending placements will be discarded. A new game asks before
            replacing the save.
          </p>
          <button className="primary" onClick={() => controller.home()}>
            Return home
          </button>
          <button onClick={closeSheet}>Keep playing</button>
        </Dialog>
      )}
      {active && !notesMode && historyTurn === undefined && drag.overlay}
    </section>
  );
}
