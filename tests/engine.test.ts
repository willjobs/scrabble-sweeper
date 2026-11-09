import { describe, expect, test } from "vitest";
import {
  createGame,
  applyAction,
  passDevice,
  startTurn,
  resumeGate,
  getPlayerView,
  annotate,
} from "../src/engine/game";
import {
  generateLayout,
  distance,
  pair,
  DEFAULT_GENERATOR,
} from "../src/engine/generator";
import { tiles, rackValue, INVENTORY } from "../src/engine/tiles";
import { dictionary } from "../src/engine/dictionary";
import { restoreGame } from "../src/storage/game-store";
import type { Game, Placement, Bonus, Placed } from "../src/engine/types";
const words = new Set([
  "AT",
  "ATE",
  "CAT",
  "CATS",
  "AN",
  "NA",
  "NO",
  "ON",
  "TO",
  "OT",
  "WE",
  "RETAINS",
  "IN",
  "IT",
  "ET",
  "TE",
  "AA",
]);
function fixture(letters = ["A", "T"]): Game {
  const game = createGame("fixture", "SCORE_ONLY");
  game.layout.fill("NONE");
  game.players[0].rack = letters.map((kind, i) => ({
    id: `test-${i}`,
    kind,
    value: INVENTORY[kind][1],
  }));
  return game;
}
function placements(game: Game, at = 112): Placement[] {
  return game.players[game.active].rack.map((t, i) => ({
    id: t.id,
    at: at + i,
    ...(t.kind === "BLANK" ? { blankAs: "A" } : {}),
  }));
}
function play(game: Game, at = 112) {
  return applyAction(
    game,
    { type: "PLAY", placements: placements(game, at) },
    words,
  );
}
function nextTurn(game: Game) {
  return startTurn(passDevice(game));
}
function placed(letter: string, turn = 1): Placed {
  return {
    id: "old-" + letter,
    kind: letter,
    letter,
    value: INVENTORY[letter][1],
    turn,
  };
}
function expectInvalid(game: Game, p: Placement[], message?: string) {
  const before = JSON.stringify(game);
  expect(() =>
    applyAction(game, { type: "PLAY", placements: p }, words),
  ).toThrow(message);
  expect(JSON.stringify(game)).toBe(before);
}
describe("generator G01–G09", () => {
  test("1000 deterministic seeds satisfy all hard constraints", () => {
    const layouts = new Set<string>();
    for (let seed = 0; seed < 1000; seed++) {
      const b = generateLayout(`G-${seed}`);
      expect(b).toHaveLength(225);
      expect(b[112]).toBe("NONE");
      for (const [type, count] of Object.entries({
        NONE: 165,
        DL: 24,
        TL: 12,
        DW: 16,
        TW: 8,
      }))
        expect(b.filter((v) => v === type)).toHaveLength(count);
      const tw: number[] = [];
      b.forEach((v, i) => {
        expect(v).toBe(b[224 - i]);
        if (v === "TW") {
          expect(distance(i, 112)).toBeGreaterThan(2);
          for (const t of tw) expect(distance(t, i)).toBeGreaterThan(1);
          tw.push(i);
        }
      });
      layouts.add(b.join(","));
    }
    expect(layouts.size).toBe(1000);
  }, 30000);
  test("reproducible and independent of bag RNG and modes", () => {
    expect(generateLayout("same")).toEqual(generateLayout("same"));
    const a = createGame("same", "SCORE_ONLY"),
      b = createGame("same", "REVEAL_USED");
    expect(a.layout).toEqual(b.layout);
    expect(a.bag).toEqual(b.bag);
    generateLayout("same", { candidates: 32 });
    expect(createGame("same", "SCORE_ONLY").bag).toEqual(a.bag);
  });
  test("bounded invalid configuration fails explicitly", () => {
    expect(() => generateLayout("x", { maxAttempts: 0 })).toThrow();
    expect(() => generateLayout("x", { candidates: 0 })).toThrow();
    expect(DEFAULT_GENERATOR.maxAttempts).toBeLessThan(1000);
  });
});
describe("inventory and turns T/E", () => {
  test("100 unique tiles, standard counts, 2 blanks, initial 86-tile bag", () => {
    const all = tiles();
    expect(all).toHaveLength(100);
    expect(new Set(all.map((t) => t.id)).size).toBe(100);
    expect(all.filter((t) => t.kind === "BLANK")).toHaveLength(2);
    for (const [kind, [count, value]] of Object.entries(INVENTORY)) {
      expect(all.filter((t) => t.kind === kind)).toHaveLength(count);
      expect(
        all.filter((t) => t.kind === kind).every((t) => t.value === value),
      ).toBe(true);
    }
    expect(createGame("x", "SCORE_ONLY").bag).toHaveLength(86);
  });
  test("exchange draws before recycling, conserves identities and is deterministic", () => {
    const a = createGame("x", "SCORE_ONLY");
    const ids = a.players[0].rack.slice(0, 3).map((t) => t.id);
    const b = applyAction(a, { type: "EXCHANGE", ids }, words);
    expect(b.players[0].rack.filter((t) => ids.includes(t.id))).toHaveLength(0);
    expect(b.players[0].rack).toHaveLength(7);
    expect(b.bag).toHaveLength(86);
    expect(
      new Set([...b.bag, ...b.players.flatMap((p) => p.rack)].map((t) => t.id))
        .size,
    ).toBe(100);
    expect(applyAction(a, { type: "EXCHANGE", ids }, words)).toEqual(b);
    expect(b.scoreless).toBe(1);
  });
  test("exchange bag threshold and invalid selection are transactional", () => {
    const a = createGame("x", "SCORE_ONLY"),
      id = a.players[0].rack[0].id;
    for (const n of [6, 7]) {
      a.bag = a.bag.slice(0, n);
      if (n === 6)
        expect(() =>
          applyAction(a, { type: "EXCHANGE", ids: [id] }, words),
        ).toThrow("seven");
    }
    a.bag = tiles().slice(0, 7);
    expect(applyAction(a, { type: "EXCHANGE", ids: [id] }, words).phase).toBe(
      "RESULT",
    );
    for (const ids of [[], [id, id], ["missing"]])
      expect(() => applyAction(a, { type: "EXCHANGE", ids }, words)).toThrow();
  });
  test("six passes deduct own rack only, once, negative totals allowed", () => {
    let a = createGame("x", "SCORE_ONLY");
    const values = a.players.map((p) => rackValue(p.rack));
    for (let i = 0; i < 6; i++) {
      a = applyAction(a, { type: "PASS" }, words);
      if (i < 5) {
        expect(a.phase).toBe("RESULT");
        a = nextTurn(a);
      }
    }
    expect(a.phase).toBe("OVER");
    expect(a.endReason).toBe("SIX_SCORELESS");
    expect(a.players.map((p) => p.score)).toEqual(values.map((v) => -v));
    expect(() => applyAction(a, { type: "PASS" }, words)).toThrow();
    expect(restoreGame(JSON.parse(JSON.stringify(a)))).toEqual(a);
  });
  test("empty bag and rack out transfers remaining opponent value exactly once", () => {
    const a = fixture();
    a.bag = [];
    a.players[1].rack = [{ id: "q", kind: "Q", value: 10 }];
    const b = play(a);
    expect(b.phase).toBe("OVER");
    expect(b.players.map((p) => p.score)).toEqual([12, -10]);
    expect(b.moves[0].total).toBe(2);
    expect(b.players[0].rack).toHaveLength(0);
  });
  test("positive score resets streak; refill uses available tiles only", () => {
    const a = fixture();
    a.scoreless = 5;
    a.bag = a.bag.slice(0, 1);
    const b = play(a);
    expect(b.scoreless).toBe(0);
    expect(b.players[0].rack).toHaveLength(1);
    expect(b.bag).toHaveLength(0);
    expect(b.phase).toBe("RESULT");
  });
  test("zero point legal blank word counts as scoreless", () => {
    const a = fixture(["BLANK", "BLANK"]);
    const p = placements(a);
    p[1].blankAs = "T";
    expect(
      applyAction(a, { type: "PLAY", placements: p }, words).scoreless,
    ).toBe(1);
  });
});
describe("placement validation V01–V12", () => {
  test("opening must span center and have two letters", () => {
    expect(play(fixture()).moves[0].words).toEqual(["AT"]);
    expectInvalid(fixture(), placements(fixture(), 0), "H8");
    expectInvalid(fixture(["A"]), placements(fixture(["A"])), "two");
  });
  test("rejects diagonal, noncollinear, empty gaps, overwrites and duplicate IDs", () => {
    const a = fixture();
    expectInvalid(
      a,
      [
        { id: "test-0", at: 112 },
        { id: "test-1", at: 128 },
      ],
      "row",
    );
    expectInvalid(
      a,
      [
        { id: "test-0", at: 112 },
        { id: "test-1", at: 114 },
      ],
      "gap",
    );
    expectInvalid(
      a,
      [
        { id: "test-0", at: 112 },
        { id: "test-0", at: 113 },
      ],
      "once",
    );
    a.board[112] = placed("A");
    expectInvalid(a, placements(a), "replaced");
    expectInvalid(
      a,
      [
        { id: "test-0", at: 128 },
        { id: "test-1", at: 129 },
      ],
      "Connect",
    );
    expectInvalid(a, [{ id: "test-0", at: -1 }], "square");
    expectInvalid(a, [{ id: "foreign", at: 113 }], "rack");
  });
  test("existing tile fills gap and maximal word is validated", () => {
    const a = fixture(["C", "T"]);
    a.board[112] = placed("A");
    const b = applyAction(
      a,
      {
        type: "PLAY",
        placements: [
          { id: "test-0", at: 111 },
          { id: "test-1", at: 113 },
        ],
      },
      words,
    );
    expect(b.moves[0].words).toEqual(["CAT"]);
  });
  test("validates main word and every crossword", () => {
    const a = fixture(["A", "T"]);
    a.board[97] = placed("Q");
    expectInvalid(a, placements(a), "QA");
    const b = fixture(["Q", "Q"]);
    expectInvalid(b, placements(b), "QQ");
  });
  test("single tile scans both axes exactly once and excludes singleton runs", () => {
    const a = fixture(["T"]);
    a.board[111] = placed("A");
    a.board[97] = placed("A");
    const b = play(a);
    expect(b.moves[0].words).toEqual(["AT", "AT"]);
    expect(b.moves[0].total).toBe(4);
  });
  test("blank assignment required and persists with zero value", () => {
    const a = fixture(["BLANK", "T"]);
    expectInvalid(
      a,
      [
        { id: "test-0", at: 112 },
        { id: "test-1", at: 113 },
      ],
      "A–Z",
    );
    const b = play(a);
    expect(b.board[112]).toMatchObject({
      kind: "BLANK",
      letter: "A",
      value: 0,
    });
    expect(b.moves[0].total).toBe(1);
  });
});
describe("numeric scoring S01–S13", () => {
  test.each<[Bonus, Bonus, number]>([
    ["NONE", "NONE", 2],
    ["DL", "NONE", 3],
    ["TL", "NONE", 4],
    ["NONE", "DW", 4],
    ["NONE", "TW", 6],
    ["TL", "DW", 8],
    ["DW", "TW", 12],
    ["TW", "TW", 18],
  ])("%s / %s -> %i", (a, b, score) => {
    const g = fixture();
    g.layout[112] = a;
    g.layout[113] = b;
    expect(play(g).moves[0].total).toBe(score);
  });
  test("old premiums never reapply", () => {
    const a = fixture(["E"]);
    a.board[111] = placed("A");
    a.board[112] = placed("T");
    a.layout[111] = "TW";
    a.layout[112] = "TL";
    expect(play(a, 113).moves[0].total).toBe(3);
  });
  test("DW on new intersection scores each word and not unrelated words", () => {
    const a = fixture(["T"]);
    a.board[111] = placed("A");
    a.board[97] = placed("A");
    a.layout[112] = "DW";
    expect(play(a).moves[0].total).toBe(8);
  });
  test.each<[Bonus, number]>([
    ["TL", 1],
    ["DW", 2],
  ])("blank on %s scores %i", (bonus, total) => {
    const a = fixture(["BLANK", "T"]);
    a.layout[112] = bonus;
    expect(play(a).moves[0].total).toBe(total);
  });
  test("seven tiles bingo and W/TL + E = 13", () => {
    const a = fixture("RETAINS".split(""));
    expect(play(a, 109).moves[0].total).toBe(57);
    const b = fixture(["W", "E"]);
    b.layout[112] = "TL";
    expect(play(b).moves[0].total).toBe(13);
  });
});
describe("private notes and projections N/H", () => {
  test("mirrored private notes allow wrong/empty hypotheses and lock center", () => {
    const a = createGame("x", "SCORE_ONLY");
    const b = annotate(a, 0, 0, 0);
    expect(b.players[0].notes[pair(224)]).toBe(0);
    expect(b.players[1].notes).toEqual({});
    const v = getPlayerView(b, 0);
    expect(v.board[0].note).toBe(0);
    expect(v.board[224].note).toBe(0);
    expect(getPlayerView(b, 1).board[0].note).toBeUndefined();
    expect(annotate(b, 0, 112, 0)).toEqual(b);
    expect(annotate(b, 0, 224, 16).players[0].notes[0]).toBe(16);
  });
  test("no layout, opponent rack, per-word points or notes in score-only projection", () => {
    const a = fixture();
    a.players[1].notes[1] = 3;
    a.players[1].rack = [{ id: "private-Q", kind: "Q", value: 10 }];
    const b = play(a);
    for (const v of [
      getPlayerView(a, 0),
      getPlayerView(b, 0),
      getPlayerView(b, 1),
      getPlayerView(b, 0, 1),
    ]) {
      const json = JSON.stringify(v);
      expect(json).not.toContain("private-Q");
      expect(json).not.toContain("layout");
      expect(json).not.toContain("bonus");
      expect(json).not.toContain("wordScore");
    }
    expect(getPlayerView(b, 0).rack).toEqual([]);
    expect(getPlayerView(b, 0).result?.total).toBe(2);
  });
  test("reveal used includes ordinary but never its empty mirror", () => {
    const a = fixture();
    a.config.mode = "REVEAL_USED";
    const b = play(a);
    const v = getPlayerView(b, 0);
    expect(v.board[113].bonus).toBe("NONE");
    expect(v.board[111].bonus).toBeUndefined();
    expect(v.board[113].fresh).toBe(true);
  });
  test("history reconstructs discovery boundary, hides private state, remains immutable", () => {
    let a = fixture();
    a.config.mode = "REVEAL_USED";
    a = nextTurn(play(a));
    a.players[1].rack = [{ id: "e", kind: "E", value: 1 }];
    a = applyAction(
      a,
      { type: "PLAY", placements: [{ id: "e", at: 114 }] },
      words,
    );
    const before = JSON.stringify(a);
    const v = getPlayerView(a, 1, 1);
    expect(v.board[114].tile).toBeNull();
    expect(v.board[114].bonus).toBeUndefined();
    expect(v.board.filter((c) => c.fresh)).toHaveLength(2);
    expect(v.rack).toEqual([]);
    expect(v.board.every((c) => c.note === undefined)).toBe(true);
    expect(JSON.stringify(a)).toBe(before);
  });
  test("handoff and resume hide racks, full endgame layout visible but past score-only hidden", () => {
    const a = fixture();
    const b = play(a);
    const h = passDevice(b);
    expect(h.active).toBe(1);
    expect(getPlayerView(h, 1).rack).toEqual([]);
    expect(startTurn(h).phase).toBe("TURN");
    expect(resumeGate(a).phase).toBe("HANDOFF");
    expect(resumeGate(b).active).toBe(0);
    const over = {
      ...b,
      phase: "OVER" as const,
      endReason: "SIX_SCORELESS" as const,
    };
    expect(
      getPlayerView(over, 0).board.every((c) => c.bonus !== undefined),
    ).toBe(true);
    expect(
      getPlayerView(over, 0, 1).board.every((c) => c.bonus === undefined),
    ).toBe(true);
  });
});
describe("serialization P01–P03", () => {
  test("roundtrips complete state, note masks and deterministic exchange continuation", () => {
    let a = createGame("persist", "REVEAL_USED");
    for (const [at, mask] of [
      [0, 0],
      [1, 31],
      [2, 6],
      [3, 16],
    ])
      a = annotate(a, 0, at, mask);
    const b = restoreGame(JSON.parse(JSON.stringify(a)));
    expect(b).toEqual(a);
    const action = {
      type: "EXCHANGE" as const,
      ids: [a.players[0].rack[0].id],
    };
    expect(applyAction(b, action, dictionary)).toEqual(
      applyAction(a, action, dictionary),
    );
  });
  test("rejects schema, inventory, dictionary, history corruption without reset", () => {
    const a = createGame("x", "SCORE_ONLY");
    for (const corrupt of [
      { ...a, schema: 99 },
      { ...a, bag: [] },
      { ...a, config: { ...a.config, dictionaryId: "other" } },
      { ...a, turn: 2 },
    ])
      expect(() => restoreGame(corrupt)).toThrow();
  });
});
describe("additional vertical and persistence boundaries", () => {
  test("vertical opening, extension and isolated one-tile invalidity", () => {
    const a = fixture();
    const b = applyAction(
      a,
      {
        type: "PLAY",
        placements: [
          { id: "test-0", at: 97 },
          { id: "test-1", at: 112 },
        ],
      },
      words,
    );
    expect(b.moves[0].total).toBe(2);
    const c = fixture(["E"]);
    c.board[97] = placed("A");
    c.board[112] = placed("T");
    expect(play(c, 127).moves[0].words).toEqual(["ATE"]);
    const d = fixture(["T"]);
    d.board[0] = placed("A");
    expectInvalid(d, [{ id: "test-0", at: 224 }], "Connect");
  });
  test("words at edges never wrap across rows", () => {
    const a = fixture(["T"]);
    a.board[14] = placed("A");
    expectInvalid(a, [{ id: "test-0", at: 15 }], "Connect");
    const b = fixture();
    b.board[195] = placed("C");
    expect(
      applyAction(
        b,
        {
          type: "PLAY",
          placements: [
            { id: "test-0", at: 210 },
            { id: "test-1", at: 211 },
          ],
        },
        new Set(["CA", "AT"]),
      ).moves[0].words,
    ).toEqual(["AT", "CA"]);
  });
  test("no action outside turn, invalid notes and note masks rejected", () => {
    const a = createGame("edges", "SCORE_ONLY");
    expect(() => annotate(a, 1, 0, 16)).toThrow("private");
    expect(() => annotate(a, 0, -1, 0)).toThrow("Invalid");
    expect(() => annotate(a, 0, 0, 32)).toThrow("Invalid");
    expect(() => startTurn(a)).toThrow();
    expect(() => passDevice(a)).toThrow();
    expectInvalid(fixture(), [], "between");
    const over = {
      ...a,
      phase: "OVER" as const,
      endReason: "SIX_SCORELESS" as const,
    };
    expect(resumeGate(over)).toEqual(over);
    expect(
      getPlayerView(annotate(over, 1, 1, 4), 0, undefined, 1).board[223].note,
    ).toBe(4);
  });
  test("dictionary contains stable ordinary words and is normalized", () => {
    for (const word of ["AT", "CAT", "WE", "RETAINS"])
      expect(dictionary.has(word)).toBe(true);
    expect(dictionary.size).toBe(274926);
    expect([...dictionary].every((w) => /^[A-Z]{2,}$/.test(w))).toBe(true);
  });
});

test("blank intersecting two words activates word bonuses with zero letter value", () => {
  const game = fixture(["BLANK"]);
  game.board[111] = placed("C");
  game.board[113] = placed("T");
  game.board[97] = placed("N");
  game.layout[112] = "DW";
  game.layout[111] = "TL";
  const result = applyAction(
    game,
    { type: "PLAY", placements: [{ id: "test-0", at: 112, blankAs: "A" }] },
    words,
  );
  expect(result.moves[0].words).toEqual(["CAT", "NA"]);
  expect(result.moves[0].total).toBe(10);
});
test("rack-out with a single remaining tile ends without requiring seven tiles", () => {
  const game = fixture(["T"]);
  game.board[111] = placed("A");
  game.bag = [];
  game.players[1].rack = [{ id: "other-Q", kind: "Q", value: 10 }];
  const result = play(game);
  expect(result.moves[0].total).toBe(2);
  expect(result.players.map((p) => p.score)).toEqual([12, -10]);
  expect(result.phase).toBe("OVER");
});

test("resuming a saved result keeps the mover and receipt behind an identity gate", () => {
  const result = applyAction(
    createGame("receipt-resume", "SCORE_ONLY"),
    { type: "PASS" },
    words,
  );
  const gate = resumeGate(result);
  expect(gate.active).toBe(result.active);
  expect(getPlayerView(gate, gate.active).rack).toEqual([]);
  const restored = restoreGame(JSON.parse(JSON.stringify(gate)));
  const receipt = startTurn(resumeGate(restored));
  expect(receipt.phase).toBe("RESULT");
  expect(getPlayerView(receipt, receipt.active).result?.total).toBe(
    result.moves[0].total,
  );
  expect(receipt.turn).toBe(result.turn);
  expect(passDevice(receipt).active).toBe(1);
});

test.each(["SCORE_ONLY", "REVEAL_USED"] as const)(
  "mover can annotate after scoring in %s until explicit handoff",
  (mode) => {
    const initial = createGame("after-score-notes", mode);
    const result = applyAction(initial, { type: "PASS" }, words);
    const noted = annotate(result, 0, 113, 4);
    expect(noted.phase).toBe("RESULT");
    expect(noted.moves).toEqual(result.moves);
    expect(noted.bag).toEqual(result.bag);
    expect(noted.players.map((p) => p.score)).toEqual(
      result.players.map((p) => p.score),
    );
    expect(getPlayerView(noted, 0).board[111].note).toBe(4);
    expect(getPlayerView(noted, 0).rack).toEqual([]);
    expect(getPlayerView(noted, 1).board[113].note).toBeUndefined();
    expect(() => annotate(noted, 1, 0, 4)).toThrow();
    const gate = passDevice(noted);
    expect(getPlayerView(gate, 1).board[113].note).toBeUndefined();
    expect(() => annotate(gate, 0, 0, 4)).toThrow();
    expect(getPlayerView(startTurn(gate), 1).board[113].note).toBe(31);
    const resumed = startTurn(
      resumeGate(restoreGame(JSON.parse(JSON.stringify(noted)))),
    );
    expect(resumed.phase).toBe("RESULT");
    expect(getPlayerView(resumed, 0).board[113].note).toBe(4);
  },
);
