import { openDB } from "idb";
import { z } from "zod";
import type { Game } from "../engine/types";
import { BONUSES } from "../engine/types";
import { DICTIONARY_ID } from "../engine/dictionary-meta";
import { INVENTORY, tiles } from "../engine/tiles";
import { distance } from "../engine/generator";
const tile = z.object({
  id: z.string(),
  kind: z.enum(Object.keys(INVENTORY) as [string, ...string[]]),
  value: z.number().int().min(0).max(10),
});
const placed = tile.extend({
  letter: z.string().regex(/^[A-Z]$/),
  turn: z.number().int().positive(),
});
const config = z.object({
  seed: z.string(),
  mode: z.enum(["SCORE_ONLY", "REVEAL_USED"]),
  generatorVersion: z.string(),
  rulesVersion: z.literal("rules-v1"),
  dictionaryId: z.literal(DICTIONARY_ID),
});
const schema = z.object({
  schema: z.literal(1),
  config,
  layout: z.array(z.enum(BONUSES)).length(225),
  board: z.array(placed.nullable()).length(225),
  bag: z.array(tile),
  rng: z.number().int().min(0).max(4294967295),
  players: z
    .array(
      z.object({
        name: z.string().max(32),
        rack: z.array(tile).max(7),
        score: z.number().int(),
        notes: z.record(
          z.string().regex(/^(?:[0-9]|[1-9][0-9]|10[0-9]|11[01])$/),
          z.number().int().min(0).max(31),
        ),
      }),
    )
    .length(2),
  active: z.union([z.literal(0), z.literal(1)]),
  turn: z.number().int().positive(),
  scoreless: z.number().int().min(0).max(6),
  phase: z.enum(["TURN", "RESULT", "HANDOFF", "OVER"]),
  resumeResult: z.literal(true).optional(),
  moves: z.array(
    z.object({
      turn: z.number().int().positive(),
      player: z.union([z.literal(0), z.literal(1)]),
      type: z.enum(["PLAY", "PASS", "EXCHANGE"]),
      tiles: z.array(
        z.object({ at: z.number().int().min(0).max(224), tile: placed }),
      ),
      words: z.array(z.string().regex(/^[A-Z]{2,15}$/)),
      total: z.number().int().nonnegative(),
      exchanged: z.number().int().min(1).max(7).optional(),
      scores: z.array(z.number().int()).length(2),
    }),
  ),
  endReason: z.enum(["RACK_OUT", "SIX_SCORELESS"]).optional(),
});
export function restoreGame(raw: unknown): Game {
  const result = schema.safeParse(raw);
  if (!result.success)
    throw Error(
      "Saved game is corrupt or uses an unsupported schema, rules or dictionary version. Export it before resetting.",
    );
  const game: Game = result.data;
  const all = [
    ...game.bag,
    ...game.players.flatMap((p) => p.rack),
    ...game.board.filter((t) => t !== null),
  ];
  const original = new Map(tiles().map((t) => [t.id, t]));
  if (
    all.length !== 100 ||
    new Set(all.map((t) => t.id)).size !== 100 ||
    all.some(
      (t) =>
        original.get(t.id)?.kind !== t.kind ||
        original.get(t.id)?.value !== t.value,
    )
  )
    throw Error(
      "Saved tile inventory is inconsistent. Export it before resetting.",
    );
  if (
    game.layout[112] !== "NONE" ||
    game.layout.some((b, i) => b !== game.layout[224 - i]) ||
    BONUSES.some(
      (b) =>
        game.layout.filter((v) => v === b).length !==
        { NONE: 165, DL: 24, TL: 12, DW: 16, TW: 8 }[b],
    )
  )
    throw Error("Saved board is inconsistent.");
  const tw = game.layout.flatMap((b, i) => (b === "TW" ? [i] : []));
  if (
    tw.some(
      (i, a) =>
        distance(i, 112) <= 2 ||
        tw.slice(a + 1).some((j) => distance(i, j) <= 1),
    )
  )
    throw Error("Saved TW constraints are inconsistent.");
  if (game.board.some((t) => t && t.kind !== "BLANK" && t.kind !== t.letter))
    throw Error("Saved tile letters are inconsistent.");
  if (
    game.moves.length !== game.turn - 1 ||
    game.moves.some((m, i) => m.turn !== i + 1) ||
    (game.phase === "OVER") !== Boolean(game.endReason)
  )
    throw Error("Saved turn history is inconsistent.");
  const reconstructed = Array(225).fill(null);
  for (const m of game.moves)
    for (const p of m.tiles) {
      if (reconstructed[p.at] || p.tile.turn !== m.turn)
        throw Error("Saved history is inconsistent.");
      reconstructed[p.at] = p.tile;
    }
  if (JSON.stringify(reconstructed) !== JSON.stringify(game.board))
    throw Error("Saved board does not match its history.");
  return game;
}
// Keep the original database name so the rebrand retains existing local games.
const database = () =>
  openDB("veiled-words", 1, {
    upgrade(db) {
      db.createObjectStore("games");
    },
  });
let writes: Promise<unknown> = Promise.resolve();
export function saveGame(game: Game): Promise<void> {
  const snapshot = structuredClone(game);
  const job = writes
    .catch(() => {})
    .then(async () => {
      const db = await database();
      await db.put("games", snapshot, "active");
      db.close();
    });
  writes = job;
  return job;
}
export async function loadGame(): Promise<Game | null> {
  await writes.catch(() => {});
  const db = await database();
  const raw = await db.get("games", "active");
  db.close();
  return raw === undefined ? null : restoreGame(raw);
}
export async function exportSave(): Promise<string> {
  const db = await database();
  const raw = await db.get("games", "active");
  db.close();
  return JSON.stringify(raw, null, 2);
}
