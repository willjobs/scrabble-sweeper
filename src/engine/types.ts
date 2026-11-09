export const BONUSES = ["NONE", "DL", "TL", "DW", "TW"] as const;
export type Bonus = (typeof BONUSES)[number];
export type Mode = "SCORE_ONLY" | "REVEAL_USED";
export type Player = 0 | 1;
export interface Tile {
  id: string;
  kind: string;
  value: number;
}
export interface Placed extends Tile {
  letter: string;
  turn: number;
}
export interface Placement {
  id: string;
  at: number;
  blankAs?: string;
}
export type Action =
  | { type: "PLAY"; placements: Placement[] }
  | { type: "PASS" }
  | { type: "EXCHANGE"; ids: string[] };
export interface Move {
  turn: number;
  player: Player;
  type: Action["type"];
  tiles: { at: number; tile: Placed }[];
  words: string[];
  total: number;
  exchanged?: number;
  scores: number[];
}
export interface Config {
  seed: string;
  mode: Mode;
  generatorVersion: string;
  rulesVersion: string;
  dictionaryId: string;
}
export interface Game {
  schema: 1;
  config: Config;
  layout: Bonus[];
  board: (Placed | null)[];
  bag: Tile[];
  rng: number;
  players: {
    name: string;
    rack: Tile[];
    score: number;
    notes: Record<string, number>;
  }[];
  active: Player;
  turn: number;
  scoreless: number;
  phase: "TURN" | "RESULT" | "HANDOFF" | "OVER";
  resumeResult?: true;
  moves: Move[];
  endReason?: "RACK_OUT" | "SIX_SCORELESS";
}
