/* global process, console, indexedDB, document, innerWidth, IDBObjectStore, DOMException */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile, readFile } from "node:fs/promises";
const base = process.env.PLAYTEST_URL || "http://127.0.0.1:4183";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });
const results = [],
  errors = [];
const screenshot = async (p, name) =>
  p.screenshot({
    path: `docs/playtest/screenshots/${name}.png`,
    fullPage: true,
  });
async function check(name, fn) {
  try {
    const data = await fn();
    results.push({ name, status: "PASS", data });
    console.log("PASS", name);
  } catch (e) {
    results.push({ name, status: "FAIL", error: e.stack });
    console.log("FAIL", name, e.message);
  }
}
async function fresh(width = 390, height = 844) {
  const c = await browser.newContext({ viewport: { width, height } });
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  return [c, p];
}
async function setup(p, mode = "Score-only", fixture = "opening", names) {
  await p.goto(base);
  await p.getByRole("button", { name: "New game", exact: true }).waitFor();
  if (names) {
    await p.getByText("Who’s playing?", { exact: false }).click();
    const inputs = p.locator(".name-fields input");
    for (let i = 0; i < 2; i++) await inputs.nth(i).fill(names[i]);
  }
  await p.getByText("Developer fixtures", { exact: true }).click();
  await p.getByLabel("Seed", { exact: true }).fill("playtest-44");
  await p.getByLabel("Starting rack").selectOption(fixture);
  await p.getByRole("radio", { name: new RegExp(mode) }).check();
  await p.getByRole("button", { name: "New game", exact: true }).click();
  await p.getByRole("button", { name: "Submit word" }).waitFor();
}
async function place(p, letter, at) {
  await p
    .getByRole("button", { name: new RegExp(`^Rack ${letter},`) })
    .first()
    .click();
  await p.getByTestId(`cell-${at}`).click();
}
async function submit(p) {
  await p.getByRole("button", { name: "Submit word" }).click();
  await p.getByRole("button", { name: "Pass device", exact: true }).waitFor();
  return (await p.locator(".result h2").innerText()).trim();
}
async function handoff(p, name) {
  await p.getByRole("button", { name: "Pass device", exact: true }).click();
  assert.equal(await p.getByRole("button", { name: /^Rack / }).count(), 0);
  await p.getByRole("button", { name: `I’m ${name} — Start turn` }).click();
  await p.getByRole("button", { name: "Submit word" }).waitFor();
}
async function stored(p) {
  return p.evaluate(async () => {
    const request = indexedDB.open("veiled-words", 1);
    const db = await new Promise((res, rej) => {
      request.onsuccess = () => res(request.result);
      request.onerror = () => rej(request.error);
    });
    const get = db.transaction("games").objectStore("games").get("active");
    return await new Promise((res, rej) => {
      get.onsuccess = () => {
        db.close();
        res(get.result);
      };
      get.onerror = () => rej(get.error);
    });
  });
}
const modeTotals = [];
for (const mode of ["Score-only", "Reveal-used"])
  await check(
    `Connected game, notes, history, exchange and completion: ${mode}`,
    async () => {
      const [c, p] = await fresh();
      const slug = mode.toLowerCase();
      await setup(p, mode);
      const initialScores = await p.locator(".score-strip").innerText();
      await place(p, "A", 0);
      await p.getByRole("button", { name: "Submit word" }).click();
      await p.getByRole("alert").filter({ hasText: "H8" }).waitFor();
      assert.equal((await stored(p)).turn, 1);
      await screenshot(p, `${slug}-invalid-opening-390`);
      await p.getByRole("button", { name: "Recall", exact: true }).click();
      await place(p, "A", 112);
      await place(p, "T", 113);
      assert.equal(await p.locator(".score-strip").innerText(), initialScores);
      await p.getByRole("button", { name: "Notes", exact: true }).click();
      await p.getByTestId("cell-0").click();
      const dialog = p.getByRole("dialog");
      await dialog.getByRole("button", { name: "Clear hypothesis" }).click();
      await dialog
        .getByText("Your note has no possibilities selected.")
        .waitFor();
      await screenshot(p, `${slug}-notes-empty-390`);
      await dialog.getByRole("button", { name: "TL", exact: true }).click();
      await dialog.getByRole("button", { name: "TW", exact: true }).click();
      await dialog.getByRole("button", { name: "Done", exact: true }).click();
      await p.getByTestId("cell-224").click();
      assert.equal(
        await dialog
          .getByRole("button", { name: "TL", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(
        await dialog
          .getByRole("button", { name: "TW", exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
      await dialog.getByRole("button", { name: "Done", exact: true }).click();
      await p.getByRole("button", { name: "Play", exact: true }).click();
      assert.match(
        await p.getByTestId("cell-112").getAttribute("aria-label"),
        /letter A/,
      );
      const totals = [await submit(p)];
      await screenshot(p, `${slug}-receipt-390`);
      if (mode === "Score-only")
        assert.ok(
          !(
            await p.getByTestId("cell-113").getAttribute("aria-label")
          ).includes("consumed"),
        );
      else {
        assert.match(
          await p.getByTestId("cell-113").getAttribute("aria-label"),
          /consumed/,
        );
        assert.ok(
          !(
            await p.getByTestId("cell-111").getAttribute("aria-label")
          ).includes("consumed"),
        );
      }
      await p.reload();
      await p.getByRole("button", { name: "Resume game", exact: true }).click();
      await p
        .getByRole("button", { name: "I’m Player 1 — Review turn result" })
        .waitFor();
      await screenshot(p, `${slug}-receipt-resume-390`);
      await p.reload();
      await p.getByRole("button", { name: "Resume game", exact: true }).click();
      await p
        .getByRole("button", { name: "I’m Player 1 — Review turn result" })
        .click();
      await p
        .getByRole("button", { name: "Pass device", exact: true })
        .waitFor();
      await handoff(p, "Player 2");
      assert.ok(
        !(await p.getByTestId("cell-0").getAttribute("aria-label")).includes(
          "your note",
        ),
      );
      await place(p, "C", 111);
      totals.push(await submit(p));
      await handoff(p, "Player 1");
      await place(p, "S", 114);
      totals.push(await submit(p));
      await handoff(p, "Player 2");
      await place(p, "O", 128);
      totals.push(await submit(p));
      await handoff(p, "Player 1");
      await place(p, "N", 143);
      await p.getByRole("button", { name: "History", exact: false }).click();
      await p.getByRole("button", { name: /#1 Player 1/ }).click();
      assert.match(
        await p.getByTestId("cell-111").getAttribute("aria-label"),
        /empty/,
      );
      assert.match(
        await p.getByTestId("cell-143").getAttribute("aria-label"),
        /empty/,
      );
      assert.equal(await p.getByRole("button", { name: /^Rack / }).count(), 0);
      await screenshot(p, `${slug}-history-390`);
      await p.getByRole("button", { name: "Return to live board" }).click();
      assert.match(
        await p.getByTestId("cell-143").getAttribute("aria-label"),
        /letter N/,
      );
      totals.push(await submit(p));
      await handoff(p, "Player 2");
      await screenshot(p, `${slug}-populated-390`);
      await p.setViewportSize({ width: 1280, height: 900 });
      await screenshot(p, `${slug}-populated-desktop`);
      const submitBox = await p
        .getByRole("button", { name: "Submit word" })
        .boundingBox();
      assert.ok(submitBox.y + submitBox.height <= 900);
      await p.getByRole("button", { name: "Exchange", exact: true }).click();
      await p
        .getByRole("button", { name: /^Rack / })
        .first()
        .click();
      await p.getByRole("button", { name: "Confirm exchange (1)" }).click();
      await p.getByRole("button", { name: "Exchange and end turn" }).click();
      await handoff(p, "Player 1");
      for (let i = 0; i < 5; i++) {
        await p.getByRole("button", { name: "Pass", exact: true }).click();
        await p.getByRole("button", { name: "Confirm pass" }).click();
        if (i < 4) await handoff(p, i % 2 === 0 ? "Player 2" : "Player 1");
      }
      await p
        .getByText("GAME OVER · FULL BOARD REVEALED", { exact: true })
        .waitFor();
      await p.setViewportSize({ width: 390, height: 844 });
      await screenshot(p, `${slug}-endgame-390`);
      assert.match(
        await p.getByTestId("cell-0").getAttribute("aria-label"),
        /revealed/,
      );
      const state = await stored(p);
      assert.equal(state.phase, "OVER");
      assert.equal(state.moves.length, 11);
      assert.deepEqual(
        state.moves.slice(0, 5).flatMap((m) => m.words),
        ["AT", "CAT", "CATS", "TO", "TON"],
      );
      const all = [
        ...state.bag,
        ...state.players.flatMap((x) => x.rack),
        ...state.board.filter(Boolean),
      ];
      assert.equal(all.length, 100);
      assert.equal(new Set(all.map((t) => t.id)).size, 100);
      modeTotals.push(totals);
      await c.close();
      return {
        totals,
        final: state.players.map((x) => x.score),
        moves: state.moves.length,
      };
    },
  );
await check("Matched modes yield identical scores for same actions", () => {
  assert.deepEqual(modeTotals[0], modeTotals[1]);
  return modeTotals;
});
await check(
  "320px blank cancellation/assignment, repositioning, long names and notes",
  async () => {
    const [c, p] = await fresh(320, 740);
    await setup(p, "Reveal-used", "blank", [
      "AlexandraTheWordWizardForever",
      "MaximilianTheMysteryWordMaster",
    ]);
    await screenshot(p, "long-names-game-320");
    assert.ok(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await place(p, "blank", 112);
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert.match(
      await p.getByTestId("cell-112").getAttribute("aria-label"),
      /empty/,
    );
    await p.getByTestId("cell-112").click();
    await screenshot(p, "blank-picker-320");
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "A", exact: true })
      .click();
    await place(p, "T", 113);
    await place(p, "T", 114);
    assert.match(
      await p.getByTestId("cell-113").getAttribute("aria-label"),
      /empty/,
    );
    await p.getByRole("button", { name: "Recall", exact: true }).click();
    await place(p, "blank", 112);
    await p
      .getByRole("dialog")
      .getByRole("button", { name: "A", exact: true })
      .click();
    await place(p, "T", 113);
    await p.getByRole("button", { name: "Notes", exact: true }).click();
    await p.getByTestId("cell-224").click();
    await screenshot(p, "long-names-notes-320");
    await p.getByRole("button", { name: "Done", exact: true }).click();
    await p.getByRole("button", { name: "Play", exact: true }).click();
    await submit(p);
    assert.match(
      await p.getByTestId("cell-112").getAttribute("aria-label"),
      /letter A, 0 points, blank/,
    );
    await p.getByRole("button", { name: "Pass device", exact: true }).click();
    await screenshot(p, "long-name-handoff-320");
    await c.close();
  },
);
await check(
  "Quota-style failure exports latest in-memory game and accurate unsaved Home",
  async () => {
    const [c, p] = await fresh();
    await setup(p);
    await p.evaluate(() => {
      IDBObjectStore.prototype.put = function () {
        throw new DOMException("Disk full", "QuotaExceededError");
      };
    });
    await p.getByRole("button", { name: "Pass", exact: true }).click();
    await p.getByRole("button", { name: "Confirm pass" }).click();
    await p.getByRole("alert").filter({ hasText: "could not save" }).waitFor();
    const download = p.waitForEvent("download");
    await p.getByRole("button", { name: "Export saved data" }).click();
    const file = await (await download).path();
    const data = JSON.parse(await readFile(file, "utf8"));
    assert.equal(data.turn, 2);
    assert.equal(data.moves[0].type, "PASS");
    assert.equal((await stored(p)).turn, 1);
    await p.getByRole("button", { name: "Home / New game" }).click();
    assert.match(await p.getByRole("dialog").innerText(), /in memory/);
    await screenshot(p, "unsaved-recovery-390");
    await c.close();
  },
);
await check("Natural draw and new-game replacement cancellation", async () => {
  const [c, p] = await fresh();
  await p.goto(base);
  await p.getByRole("button", { name: "New game", exact: true }).click();
  await p.getByRole("button", { name: "Submit word" }).waitFor();
  assert.equal(await p.getByRole("button", { name: /^Rack / }).count(), 7);
  const before = await stored(p);
  await p.getByRole("button", { name: "Home / New game" }).click();
  await p.getByRole("button", { name: "Return home", exact: true }).click();
  await p.getByRole("button", { name: "New game", exact: true }).click();
  await p.getByRole("button", { name: "Keep saved game" }).click();
  assert.equal((await stored(p)).config.seed, before.config.seed);
  await screenshot(p, "resume-home-390");
  await c.close();
});
await browser.close();
await writeFile(
  "docs/playtest/exploration-results.json",
  JSON.stringify({ results, pageErrors: errors }, null, 2),
);
console.log(JSON.stringify({ results, pageErrors: errors }, null, 2));
if (results.some((r) => r.status === "FAIL") || errors.length)
  process.exitCode = 1;
