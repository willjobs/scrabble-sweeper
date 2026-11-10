import {
  annotate,
  applyAction,
  createGame,
  getPlayerView,
  passDevice,
  resumeGate,
  startTurn,
} from "./engine/game";
import type { PlayerView } from "./engine/game";
import type { Action, Game, Mode, Player } from "./engine/types";
// Keep the large word list off the startup path; failed prefetches can retry on play.
let dictionaryLoad: Promise<ReadonlySet<string>> | null = null;
function loadDictionary(): Promise<ReadonlySet<string>> {
  return (dictionaryLoad ??= import("./engine/dictionary")
    .then((m) => m.dictionary)
    .catch(() => {
      dictionaryLoad = null;
      throw Error(
        "The word list could not load. Reconnect and try submitting again.",
      );
    }));
}
import { loadGame, saveGame, exportSave } from "./storage/game-store";
export const DEV_TOOLS =
  import.meta.env.DEV || import.meta.env.VITE_DEV_TOOLS === "1";
interface Snapshot {
  view: PlayerView | null;
  hasSave: boolean;
  loading: boolean;
  busy: boolean;
  warning: string;
  saved: boolean;
  error: string;
}
let authoritative: Game | null = null;
let snapshot: Snapshot = {
  view: null,
  hasSave: false,
  loading: true,
  busy: false,
  warning: "",
  saved: false,
  error: "",
};
const listeners = new Set<() => void>();
const emit = (patch: Partial<Snapshot>) => {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach((fn) => fn());
};
let writeRevision = 0;
async function persist(game: Game) {
  const revision = ++writeRevision;
  emit({ saved: false });
  try {
    await saveGame(game);
    if (revision === writeRevision) emit({ saved: true, warning: "" });
  } catch {
    if (revision === writeRevision)
      emit({
        saved: false,
        warning:
          "Storage could not save this game. You can keep playing in memory; closing the app may lose progress.",
      });
  }
}
export const controller = {
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  getSnapshot: () => snapshot,
  prepareDictionary() {
    void loadDictionary().catch(() => {});
  },
  async initialize() {
    try {
      authoritative = await loadGame();
      emit({ hasSave: !!authoritative, loading: false });
    } catch (e) {
      emit({
        loading: false,
        warning: e instanceof Error ? e.message : "Unable to load saved game.",
        hasSave: true,
      });
    }
  },
  async newGame(names: string[], mode: Mode, seed?: string, fixture?: string) {
    if (snapshot.busy) return;
    emit({ busy: true, error: "" });
    try {
      const game = createGame(
        DEV_TOOLS && seed ? seed : crypto.randomUUID(),
        mode,
        names,
      );
      if (DEV_TOOLS && fixture) {
        const desired =
          fixture === "blank"
            ? ["BLANK", "T", "C", "E", "R", "S", "N"]
            : ["A", "T", "C", "E", "R", "S", "N"];
        const pool = [
          ...game.players[0].rack,
          ...game.players[1].rack,
          ...game.bag,
        ];
        game.players[0].rack = desired.map((kind) => {
          const i = pool.findIndex((t) => t.kind === kind);
          return pool.splice(i, 1)[0];
        });
        game.players[1].rack = pool.splice(0, 7);
        game.bag = pool;
      }
      await persist(game);
      authoritative = game;
      emit({ view: getPlayerView(game, game.active), hasSave: true });
    } catch (e) {
      emit({ error: (e as Error).message });
    } finally {
      emit({ busy: false });
    }
  },
  async resume() {
    if (!authoritative) return;
    const game = resumeGate(authoritative);
    await persist(game);
    authoritative = game;
    emit({ view: getPlayerView(game, game.active) });
  },
  async action(action: Action): Promise<boolean> {
    if (!authoritative || snapshot.busy) return false;
    emit({ busy: true, error: "" });
    try {
      const dictionary =
        action.type === "PLAY" ? await loadDictionary() : new Set<string>();
      const game = applyAction(authoritative, action, dictionary);
      await persist(game);
      authoritative = game;
      emit({ view: getPlayerView(game, game.active) });
      return true;
    } catch (e) {
      emit({ error: (e as Error).message });
      return false;
    } finally {
      emit({ busy: false });
    }
  },
  async handoff() {
    if (!authoritative || snapshot.busy) return;
    const game = passDevice(authoritative);
    authoritative = game;
    // Lock private notes immediately, even if saving the handoff takes time.
    emit({ busy: true, view: getPlayerView(game, game.active), error: "" });
    try {
      await persist(game);
    } finally {
      emit({ busy: false });
    }
  },
  async start() {
    if (!authoritative || snapshot.busy) return;
    emit({ busy: true });
    try {
      const game = startTurn(authoritative);
      await persist(game);
      authoritative = game;
      emit({ view: getPlayerView(game, game.active) });
    } finally {
      emit({ busy: false });
    }
  },
  async note(at: number, mask: number, player?: Player) {
    if (!authoritative || snapshot.busy) return;
    const game = annotate(
      authoritative,
      player ?? authoritative.active,
      at,
      mask,
    );
    authoritative = game;
    emit({ view: getPlayerView(game, game.active), saved: false });
    await persist(game);
  },
  view(turn?: number, compare?: Player) {
    return authoritative
      ? getPlayerView(authoritative, authoritative.active, turn, compare)
      : null;
  },
  clearError() {
    if (snapshot.error) emit({ error: "" });
  },
  home() {
    emit({ view: null, error: "" });
  },
  async export() {
    const text = authoritative
      ? JSON.stringify(authoritative, null, 2)
      : await exportSave();
    const url = URL.createObjectURL(
      new Blob([text], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "tile-theory-save.json";
    a.click();
    URL.revokeObjectURL(url);
  },
};
