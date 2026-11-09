import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import {
  createGame,
  annotate,
  applyAction,
  passDevice,
  startTurn,
} from "../src/engine/game";
import {
  saveGame,
  loadGame,
  exportSave,
  restoreGame,
} from "../src/storage/game-store";
import { dictionary } from "../src/engine/dictionary";
test("IndexedDB transaction stores latest note snapshot despite rapid writes", async () => {
  let game = createGame("idb", "SCORE_ONLY");
  const jobs = [];
  for (let i = 0; i < 31; i++) {
    game = annotate(game, 0, 0, i);
    jobs.push(saveGame(game));
  }
  await Promise.all(jobs);
  expect(await loadGame()).toEqual(game);
  expect(JSON.parse(await exportSave())).toEqual(game);
});
test("persisted turn is neither duplicated nor lost and continuation stays deterministic", async () => {
  let game = createGame("idb2", "REVEAL_USED");
  game = applyAction(
    game,
    {
      type: "EXCHANGE",
      ids: game.players[0].rack.slice(0, 2).map((t) => t.id),
    },
    dictionary,
  );
  await saveGame(game);
  const restored = (await loadGame())!;
  expect(restored).toEqual(game);
  const next = (g: typeof game) =>
    applyAction(startTurn(passDevice(g)), { type: "PASS" }, dictionary);
  expect(next(restored)).toEqual(next(game));
});
test("unknown/corrupt saves retain recoverable original payload", async () => {
  const game = createGame("idb3", "SCORE_ONLY");
  await saveGame(game);
  const raw = JSON.parse(await exportSave());
  raw.schema = 88;
  expect(() => restoreGame(raw)).toThrow("unsupported");
  expect(await loadGame()).toEqual(game);
});
