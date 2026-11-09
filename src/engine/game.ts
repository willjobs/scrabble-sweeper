import { GENERATOR_VERSION, generateLayout, pair } from "./generator";
import { next, seedNumber, shuffle } from "./random";
import { tiles, rackValue } from "./tiles";
import { scorePlacement, validatePlacement } from "./rules";
import type { Action, Game, Mode, Player, Move, Tile } from "./types";
import { DICTIONARY_ID } from "./dictionary";
export function createGame(
  seed: string,
  mode: Mode,
  names = ["Player 1", "Player 2"],
): Game {
  let rng = seedNumber(`${seed}:bag:v1`);
  const bag = shuffle(tiles(), () => {
    const [n, s] = next(rng);
    rng = s;
    return n;
  });
  const players = names
    .slice(0, 2)
    .map((name, i) => ({
      name: name.trim().slice(0, 32) || `Player ${i + 1}`,
      rack: bag.splice(0, 7),
      score: 0,
      notes: {},
    }));
  return {
    schema: 1,
    config: {
      seed,
      mode,
      generatorVersion: GENERATOR_VERSION,
      rulesVersion: "rules-v1",
      dictionaryId: DICTIONARY_ID,
    },
    layout: generateLayout(seed),
    board: Array(225).fill(null),
    bag,
    rng,
    players,
    active: 0,
    turn: 1,
    scoreless: 0,
    phase: "TURN",
    moves: [],
  };
}
export function applyAction(
  state: Game,
  action: Action,
  dictionary: ReadonlySet<string>,
): Game {
  if (state.phase !== "TURN") throw Error("Start your turn before playing.");
  // All mutations target a detached candidate; failures leave the source untouched.
  const game = structuredClone(state);
  const player = game.players[game.active];
  let total = 0;
  const move: Move = {
    turn: game.turn,
    player: game.active,
    type: action.type,
    tiles: [],
    words: [],
    total: 0,
    scores: [],
  };
  if (action.type === "PLAY") {
    const validated = validatePlacement(game, action.placements, dictionary);
    total = scorePlacement(game, action.placements, validated);
    game.board = validated.board;
    move.words = validated.words.map((w) => w.word);
    move.tiles = action.placements.map((p) => ({
      at: p.at,
      tile: game.board[p.at]!,
    }));
    const ids = new Set(action.placements.map((p) => p.id));
    player.rack = player.rack.filter((t) => !ids.has(t.id));
    player.rack.push(...game.bag.splice(0, 7 - player.rack.length));
    player.score += total;
  } else if (action.type === "EXCHANGE") {
    if (game.bag.length < 7)
      throw Error("At least seven tiles must remain in the bag.");
    if (
      !action.ids.length ||
      new Set(action.ids).size !== action.ids.length ||
      action.ids.some((id) => !player.rack.some((t) => t.id === id))
    )
      throw Error("Select one or more distinct rack tiles.");
    const returned = player.rack.filter((t) => action.ids.includes(t.id));
    const replacements = game.bag.splice(0, returned.length);
    player.rack = player.rack.map((t) =>
      action.ids.includes(t.id) ? replacements.shift()! : t,
    );
    game.bag = shuffle([...game.bag, ...returned], () => {
      const [n, s] = next(game.rng);
      game.rng = s;
      return n;
    });
    move.exchanged = returned.length;
  }
  game.scoreless = total > 0 ? 0 : game.scoreless + 1;
  move.total = total;
  const out =
    action.type === "PLAY" && game.bag.length === 0 && player.rack.length === 0;
  if (out || game.scoreless >= 6) {
    game.phase = "OVER";
    game.endReason = out ? "RACK_OUT" : "SIX_SCORELESS";
    if (out) {
      const other = game.players[1 - game.active];
      const value = rackValue(other.rack);
      other.score -= value;
      player.score += value;
    } else for (const p of game.players) p.score -= rackValue(p.rack);
  } else game.phase = "RESULT";
  move.scores = game.players.map((p) => p.score);
  game.moves.push(move);
  game.turn++;
  return game;
}
export function passDevice(state: Game): Game {
  if (state.phase !== "RESULT") throw Error("Review the result first.");
  return { ...state, active: (1 - state.active) as Player, phase: "HANDOFF" };
}
export function startTurn(state: Game): Game {
  if (state.phase !== "HANDOFF") throw Error("No handoff is pending.");
  return { ...state, phase: "TURN" };
}
export function resumeGate(state: Game): Game {
  if (state.phase === "OVER") return state;
  if (state.phase === "RESULT") return passDevice(state);
  return { ...state, phase: "HANDOFF" };
}
export function annotate(
  state: Game,
  player: Player,
  at: number,
  mask: number,
): Game {
  if (
    state.phase !== "OVER" &&
    (state.phase !== "TURN" || state.active !== player)
  )
    throw Error("Notes are private to your turn.");
  if (
    !Number.isInteger(at) ||
    at < 0 ||
    at > 224 ||
    !Number.isInteger(mask) ||
    mask < 0 ||
    mask > 31
  )
    throw Error("Invalid note.");
  if (at === 112) return state;
  const game = structuredClone(state);
  game.players[player].notes[pair(at)] = mask;
  return game;
}
export interface CellView {
  tile: ReturnType<typeof publicTile> | null;
  bonus?: Game["layout"][number];
  note?: number;
  fresh: boolean;
}
function publicTile(t: NonNullable<Game["board"][number]>) {
  return { letter: t.letter, value: t.value, blank: t.kind === "BLANK" };
}
export interface PlayerView {
  mode: Mode;
  phase: Game["phase"];
  names: string[];
  scores: number[];
  active: Player;
  turn: number;
  bagCount: number;
  board: CellView[];
  rack: Tile[];
  history: {
    turn: number;
    player: Player;
    type: Move["type"];
    words: string[];
    total: number;
    exchanged?: number;
  }[];
  result?: { total: number; player: Player };
  endReason?: Game["endReason"];
}
export function getPlayerView(
  game: Game,
  viewer: Player,
  historyTurn?: number,
  compareNotes?: Player,
): PlayerView {
  const historical = historyTurn !== undefined;
  const board: Game["board"][number][] = historical
    ? Array(225).fill(null)
    : game.board;
  if (historical)
    for (const m of game.moves)
      if (m.turn <= historyTurn) for (const p of m.tiles) board[p.at] = p.tile;
  const privateTurn =
    !historical && game.phase === "TURN" && viewer === game.active;
  const notes = privateTurn
    ? game.players[viewer].notes
    : game.phase === "OVER" && !historical && compareNotes !== undefined
      ? game.players[compareNotes].notes
      : undefined;
  const last = game.moves.at(-1);
  const selected = historical ? historyTurn : last?.turn;
  return {
    mode: game.config.mode,
    phase: game.phase,
    names: game.players.map((p) => p.name),
    scores: game.players.map((p) => p.score),
    active: game.active,
    turn: game.turn,
    bagCount: game.bag.length,
    board: board.map((tile, i) => ({
      tile: tile ? publicTile(tile) : null,
      ...((!historical && game.phase === "OVER") ||
      (game.config.mode === "REVEAL_USED" && tile)
        ? { bonus: game.layout[i] }
        : {}),
      ...(notes ? { note: i === 112 ? 1 : (notes[pair(i)] ?? 31) } : {}),
      fresh: tile?.turn === selected,
    })),
    rack: privateTurn ? game.players[viewer].rack.map((t) => ({ ...t })) : [],
    history: game.moves.map((m) => ({
      turn: m.turn,
      player: m.player,
      type: m.type,
      words: [...m.words],
      total: m.total,
      ...(m.exchanged ? { exchanged: m.exchanged } : {}),
    })),
    ...(game.phase === "RESULT" && last
      ? { result: { total: last.total, player: last.player } }
      : {}),
    ...(game.endReason ? { endReason: game.endReason } : {}),
  };
}
