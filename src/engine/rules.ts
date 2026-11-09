import type { Game, Placement, Placed } from "./types";
export const neighbors = (i: number) =>
  [
    i % 15 > 0 ? i - 1 : -1,
    i % 15 < 14 ? i + 1 : -1,
    i >= 15 ? i - 15 : -1,
    i < 210 ? i + 15 : -1,
  ].filter((n) => n >= 0);
function run(board: (Placed | null)[], at: number, step: 1 | 15): number[] {
  const adjacent = (a: number, b: number) =>
    b >= 0 &&
    b < 225 &&
    (step === 15 || Math.floor(a / 15) === Math.floor(b / 15));
  let start = at;
  while (adjacent(start, start - step) && board[start - step]) start -= step;
  const cells = [start];
  for (let i = start + step; adjacent(i - step, i) && board[i]; i += step)
    cells.push(i);
  return cells;
}
export function validatePlacement(
  game: Game,
  placements: Placement[],
  dictionary: ReadonlySet<string>,
): { board: (Placed | null)[]; words: { word: string; cells: number[] }[] } {
  if (!placements.length || placements.length > 7)
    throw Error("Place between one and seven tiles.");
  const rack = game.players[game.active].rack;
  const ids = new Set<string>();
  const cells = new Set<number>();
  const board = [...game.board];
  for (const p of placements) {
    if (!Number.isInteger(p.at) || p.at < 0 || p.at >= 225)
      throw Error("Choose a square on the board.");
    if (ids.has(p.id) || cells.has(p.at))
      throw Error("Each tile and square can only be used once.");
    const tile = rack.find((t) => t.id === p.id);
    if (!tile) throw Error("Choose tiles from your rack.");
    if (board[p.at]) throw Error("A committed tile cannot be replaced.");
    if (tile.kind === "BLANK" && !/^[A-Z]$/.test(p.blankAs ?? ""))
      throw Error("Choose a letter A–Z for the blank.");
    ids.add(p.id);
    cells.add(p.at);
    board[p.at] = {
      ...tile,
      letter: tile.kind === "BLANK" ? p.blankAs! : tile.kind,
      turn: game.turn,
    };
  }
  const rows = new Set(placements.map((p) => Math.floor(p.at / 15))),
    cols = new Set(placements.map((p) => p.at % 15));
  if (rows.size > 1 && cols.size > 1)
    throw Error("All new tiles must share one row or column.");
  if (!game.board.some(Boolean)) {
    if (!cells.has(112)) throw Error("The opening word must cover H8.");
  } else if (
    !placements.some((p) => neighbors(p.at).some((i) => game.board[i]))
  )
    throw Error("Connect your word to an existing tile.");
  const steps: (1 | 15)[] =
    placements.length === 1 ? [1, 15] : rows.size === 1 ? [1] : [15];
  const words: { word: string; cells: number[] }[] = [];
  const seen = new Set<string>();
  const add = (at: number, step: 1 | 15) => {
    const cells = run(board, at, step);
    if (cells.length < 2) return;
    const key = cells.join(",");
    if (!seen.has(key)) {
      seen.add(key);
      words.push({ word: cells.map((i) => board[i]!.letter).join(""), cells });
    }
  };
  const main = run(board, placements[0].at, steps[0]);
  if (placements.length > 1 && placements.some((p) => !main.includes(p.at)))
    throw Error("Fill every gap in the word.");
  for (const step of steps) add(placements[0].at, step);
  if (placements.length > 1)
    for (const p of placements) add(p.at, steps[0] === 1 ? 15 : 1);
  if (!words.length) throw Error("Form a word of at least two letters.");
  for (const { word } of words)
    if (!dictionary.has(word))
      throw Error(`${word} is not in the bundled dictionary.`);
  return { board, words };
}
export function scorePlacement(
  game: Game,
  placements: Placement[],
  validated: ReturnType<typeof validatePlacement>,
): number {
  const fresh = new Set(placements.map((p) => p.at));
  let total = 0;
  for (const word of validated.words) {
    let sum = 0,
      multiplier = 1;
    for (const i of word.cells) {
      const bonus = fresh.has(i) ? game.layout[i] : "NONE";
      sum +=
        validated.board[i]!.value *
        (bonus === "DL" ? 2 : bonus === "TL" ? 3 : 1);
      multiplier *= bonus === "DW" ? 2 : bonus === "TW" ? 3 : 1;
    }
    total += sum * multiplier;
  }
  return total + (placements.length === 7 ? 50 : 0);
}
