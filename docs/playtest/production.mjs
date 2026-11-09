/* global console, indexedDB, window, PerformanceObserver, performance, requestAnimationFrame, innerWidth, document, navigator, process */
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" }),
  results = [];
const base = "http://127.0.0.1:4184";
async function dbGet(p) {
  return p.evaluate(async () => {
    const req = indexedDB.open("veiled-words", 1);
    const db = await new Promise((r, j) => {
      req.onsuccess = () => r(req.result);
      req.onerror = () => j(req.error);
    });
    const request = db.transaction("games").objectStore("games").get("active");
    return new Promise((r, j) => {
      request.onsuccess = () => {
        db.close();
        r(request.result);
      };
      request.onerror = () => j(request.error);
    });
  });
}
async function dbPut(p, data) {
  await p.evaluate(async (data) => {
    const req = indexedDB.open("veiled-words", 1);
    const db = await new Promise((r, j) => {
      req.onsuccess = () => r(req.result);
      req.onerror = () => j(req.error);
    });
    const tx = db.transaction("games", "readwrite");
    tx.objectStore("games").put(data, "active");
    await new Promise((r, j) => {
      tx.oncomplete = r;
      tx.onerror = () => j(tx.error);
    });
    db.close();
  }, data);
}
async function fresh(opts = {}) {
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ...opts,
  });
  return [c, await c.newPage()];
}
async function check(name, fn) {
  try {
    const data = await fn();
    results.push({ name, status: "PASS", data });
    console.log("PASS", name, JSON.stringify(data));
  } catch (e) {
    results.push({ name, status: "FAIL", error: e.stack });
    console.log("FAIL", name, e.message);
  }
}
const [fixtureContext, fp] = await fresh();
await fp.goto("http://127.0.0.1:4183");
await fp.getByText("Developer fixtures", { exact: true }).click();
await fp.getByLabel("Seed", { exact: true }).fill("playtest-44");
await fp.getByLabel("Starting rack").selectOption("opening");
await fp.getByRole("button", { name: "New game", exact: true }).click();
await fp.getByRole("button", { name: "Submit word" }).waitFor();
const fixture = await dbGet(fp);
await fixtureContext.close();
await check(
  "Cold production startup at 4x CPU, three fresh browser contexts",
  async () => {
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const [c, p] = await fresh({ serviceWorkers: "block" });
      const cdp = await c.newCDPSession(p);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      await p.addInitScript(() => {
        window.playtestLongTasks = [];
        new PerformanceObserver((list) =>
          window.playtestLongTasks.push(
            ...list
              .getEntries()
              .map((e) => ({ start: e.startTime, duration: e.duration })),
          ),
        ).observe({ type: "longtask", buffered: true });
      });
      await p.goto(base);
      await p.getByRole("button", { name: "New game", exact: true }).waitFor();
      await p.waitForTimeout(1800);
      runs.push(
        await p.evaluate(() => {
          const fcp = performance.getEntriesByName("first-contentful-paint")[0]
            ?.startTime;
          const tasks = window.playtestLongTasks;
          return {
            fcp,
            largestPrePaint: Math.max(
              0,
              ...tasks.filter((t) => t.start < fcp).map((t) => t.duration),
            ),
            largestTotal: Math.max(0, ...tasks.map((t) => t.duration)),
            tasks,
            dictionary: performance
              .getEntriesByType("resource")
              .filter((x) => x.name.includes("dictionary-"))
              .map((x) => ({
                start: x.startTime,
                end: x.responseEnd,
                duration: x.duration,
              })),
          };
        }),
      );
      await c.close();
    }
    return runs;
  },
);
await check("Natural production game notes response at 4x CPU", async () => {
  const [c, p] = await fresh({ serviceWorkers: "block" });
  const cdp = await c.newCDPSession(p);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await p.goto(base);
  await p.getByRole("button", { name: "New game", exact: true }).click();
  await p.getByRole("button", { name: "Submit word" }).waitFor();
  await p.waitForTimeout(700);
  await p.getByRole("button", { name: "Notes", exact: true }).click();
  await p.getByTestId("cell-0").click();
  const times = [];
  for (let i = 0; i < 12; i++) {
    times.push(
      await p
        .getByRole("dialog")
        .getByRole("button", { name: "TL", exact: true })
        .evaluate(
          (b) =>
            new Promise((resolve) => {
              const start = performance.now();
              b.click();
              requestAnimationFrame(() =>
                requestAnimationFrame(() => resolve(performance.now() - start)),
              );
            }),
        ),
    );
  }
  await c.close();
  return {
    min: Math.min(...times),
    max: Math.max(...times),
    mean: times.reduce((a, b) => a + b) / times.length,
    times,
  };
});
await check(
  "Production 320/390/desktop opening fits without horizontal page scroll",
  async () => {
    const data = [];
    for (const [width, height, name] of [
      [320, 740, "home-production-320"],
      [390, 844, "home-production-390"],
      [1280, 900, "home-production-desktop"],
    ]) {
      const [c, p] = await fresh({ viewport: { width, height } });
      await p.goto(base);
      await p.getByRole("button", { name: "New game", exact: true }).waitFor();
      assert.equal(
        await p.getByText("Developer fixtures", { exact: true }).count(),
        0,
      );
      const w = await p.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.equal(w.width, w.scroll);
      data.push(w);
      await p.screenshot({
        path: `docs/playtest/screenshots/${name}.png`,
        fullPage: true,
      });
      await c.close();
    }
    return data;
  },
);
await check(
  "Production offline refresh and dictionary-backed placement",
  async () => {
    const [c, p] = await fresh();
    await p.goto(base);
    await p.evaluate(async () => await navigator.serviceWorker.ready);
    await dbPut(p, fixture);
    await p.reload();
    await c.setOffline(true);
    await p.reload();
    await p.getByRole("button", { name: "Resume game", exact: true }).click();
    await p.getByRole("button", { name: "I’m Player 1 — Start turn" }).click();
    for (const [l, at] of [
      ["A", 112],
      ["T", 113],
    ]) {
      await p
        .getByRole("button", { name: new RegExp(`^Rack ${l},`) })
        .first()
        .click();
      await p.getByTestId(`cell-${at}`).click();
    }
    await p.getByRole("button", { name: "Submit word" }).click();
    await p.getByRole("button", { name: "Pass device", exact: true }).waitFor();
    await p.screenshot({
      path: "docs/playtest/screenshots/offline-result-390.png",
      fullPage: true,
    });
    const out = await dbGet(p);
    assert.equal(out.moves[0].words[0], "AT");
    await c.close();
    return { turn: out.turn, word: out.moves[0].words[0] };
  },
);
await check(
  "Dictionary download failure then same-page submission recovery",
  async () => {
    const [c, p] = await fresh({ serviceWorkers: "block" });
    let blocked = 0;
    await p.route("**/assets/dictionary-*.js", (route) => {
      blocked++;
      return route.abort("failed");
    });
    await p.goto(base);
    await dbPut(p, fixture);
    await p.reload();
    await p.getByRole("button", { name: "Resume game", exact: true }).click();
    await p.getByRole("button", { name: "I’m Player 1 — Start turn" }).click();
    for (const [l, at] of [
      ["A", 112],
      ["T", 113],
    ]) {
      await p
        .getByRole("button", { name: new RegExp(`^Rack ${l},`) })
        .first()
        .click();
      await p.getByTestId(`cell-${at}`).click();
    }
    await p.getByRole("button", { name: "Submit word" }).click();
    await p
      .getByRole("alert")
      .filter({ hasText: "word list could not load" })
      .waitFor();
    const before = await dbGet(p);
    assert.equal(before.turn, 1);
    await p.screenshot({
      path: "docs/playtest/screenshots/dictionary-network-error-390.png",
      fullPage: true,
    });
    await p.unroute("**/assets/dictionary-*.js");
    await p.getByRole("button", { name: "Submit word" }).click();
    let recovered = false;
    try {
      await p
        .getByRole("button", { name: "Pass device", exact: true })
        .waitFor({ timeout: 4000 });
      recovered = true;
    } catch {
      // Recovery is recorded below; a failed same-page retry is not hidden.
    }
    const details = {
      blocked,
      recovered,
      error: await p.getByRole("alert").allTextContents(),
      turn: (await dbGet(p)).turn,
    };
    if (!recovered) {
      await p.screenshot({
        path: "docs/playtest/screenshots/dictionary-retry-error-390.png",
        fullPage: true,
      });
      await p.reload();
      await p.getByRole("button", { name: "Resume game", exact: true }).click();
      await p
        .getByRole("button", { name: "I’m Player 1 — Start turn" })
        .click();
      for (const [l, at] of [
        ["A", 112],
        ["T", 113],
      ]) {
        await p
          .getByRole("button", { name: new RegExp(`^Rack ${l},`) })
          .first()
          .click();
        await p.getByTestId(`cell-${at}`).click();
      }
      await p.getByRole("button", { name: "Submit word" }).click();
      await p
        .getByRole("button", { name: "Pass device", exact: true })
        .waitFor();
      details.reloadRecovery = true;
    }
    await c.close();
    assert.ok(
      recovered,
      "Dictionary submission did not recover on the same page",
    );
    return details;
  },
);
await browser.close();
await writeFile(
  "docs/playtest/production-results.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results, null, 2));

if (results.some((result) => result.status === "FAIL")) process.exitCode = 1;
