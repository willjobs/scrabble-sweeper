import { expect, test, type Page } from "@playwright/test";
async function setup(page: Page, mode = "Score-only", blank = false) {
  await page.goto("/");
  await page.getByRole("button", { name: "New game", exact: true }).waitFor();
  await page.screenshot({ path: "test-results/new-game.png", fullPage: true });
  await page.getByText("Developer fixtures", { exact: true }).click();
  await page.getByLabel("Seed", { exact: true }).fill("browser-fixture");
  await page
    .getByLabel("Starting rack")
    .selectOption(blank ? "blank" : "opening");
  await page.getByRole("radio", { name: new RegExp(mode) }).check();
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit word" })).toBeVisible();
}
async function place(page: Page, letter: string, cell: number) {
  await page.getByTestId(`cell-${cell}`).click();
  await page
    .getByRole("button", { name: new RegExp(`^Rack ${letter},`) })
    .click();
}
async function opening(page: Page) {
  await place(page, "A", 112);
  await place(page, "T", 113);
  await page.getByRole("button", { name: "Submit word" }).click();
  await expect(
    page.getByRole("button", { name: "Pass device", exact: true }),
  ).toBeVisible();
}
async function handoff(page: Page, name = "Player 2") {
  await page.getByRole("button", { name: "Pass device", exact: true }).click();
  await expect(page.getByRole("region", { name: "Your rack" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
  await page.screenshot({ path: "test-results/handoff.png", fullPage: true });
  await page.getByRole("button", { name: `I’m ${name} — Start turn` }).click();
}
test("phone workflow: invalid placement, recall, result, private handoff, reload", async ({
  page,
}) => {
  await setup(page);
  await place(page, "A", 0);
  await page.getByRole("button", { name: "Submit word" }).click();
  await expect(page.getByRole("alert")).toContainText("H8");
  await expect(
    page.getByRole("button", { name: "Pass device", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Recall", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await opening(page);
  await expect(page.getByTestId("cell-113")).not.toHaveAttribute(
    "aria-label",
    /consumed|ordinary|DL|TL|DW|TW/,
  );
  await handoff(page);
  await page.reload();
  await page.getByRole("button", { name: "Resume game", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
  await page.getByRole("button", { name: "I’m Player 2 — Start turn" }).click();
  await expect(page.getByTestId("cell-112")).toHaveAttribute(
    "aria-label",
    /letter A/,
  );
});
test("reveal-used discovers occupied squares only; history respects time boundary", async ({
  page,
}) => {
  await setup(page, "Reveal-used");
  await opening(page);
  await expect(page.getByTestId("cell-113")).toHaveAttribute(
    "aria-label",
    /consumed/,
  );
  await expect(page.getByTestId("cell-111")).not.toHaveAttribute(
    "aria-label",
    /consumed|revealed/,
  );
  await handoff(page);
  await page.getByRole("button", { name: "History", exact: false }).click();
  await page.getByRole("button", { name: /#1 Player 1/ }).click();
  await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
  await expect(page.getByTestId("cell-113")).toHaveAttribute(
    "aria-label",
    /consumed/,
  );
  await page.getByRole("button", { name: "Return to live board" }).click();
  await expect(
    page.getByRole("button", { name: /^Rack / }).first(),
  ).toBeVisible();
});
test("notes mirror, allow contradictions, preserve staging and stay private", async ({
  page,
}) => {
  await setup(page);
  await place(page, "A", 112);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByTestId("cell-0").click();
  const editor = page.getByRole("region", { name: "Private notes" });
  await page.screenshot({ path: "test-results/notes.png", fullPage: true });
  await editor.getByLabel("Multiple possibilities").check();
  await editor.getByRole("button", { name: "TL", exact: true }).click();
  await editor.getByRole("button", { name: "TW", exact: true }).click();
  await expect(page.getByTestId("cell-224")).toHaveAttribute(
    "aria-label",
    /your note/,
  );
  await page.getByTestId("cell-224").click();
  await expect(
    editor.getByRole("button", { name: "TL", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await editor.getByRole("button", { name: "Clear hypothesis" }).click();
  await expect(editor).toContainText("No possibilities");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByTestId("cell-112")).toHaveAttribute(
    "aria-label",
    /letter A/,
  );
  await place(page, "T", 113);
  await page.getByRole("button", { name: "Submit word" }).click();
  await handoff(page);
  await expect(page.getByTestId("cell-0")).not.toHaveAttribute(
    "aria-label",
    /your note/,
  );
});
test("blank picker cancels, assigns and persists zero-valued blank", async ({
  page,
}) => {
  await setup(page, "Score-only", true);
  await place(page, "blank", 112);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.getByTestId("cell-112")).toHaveAttribute(
    "aria-label",
    /empty/,
  );
  await page.getByTestId("cell-112").click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "A", exact: true })
    .click();
  await place(page, "T", 113);
  await page.getByRole("button", { name: "Submit word" }).click();
  await expect(page.getByTestId("cell-112")).toHaveAttribute(
    "aria-label",
    /letter A, 0 points, blank/,
  );
});
test("exchange and six scoreless actions finish and reveal full board", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Exchange", exact: true }).click();
  await page.getByRole("button", { name: /^Rack A,/ }).click();
  await page.getByRole("button", { name: "Confirm exchange (1)" }).click();
  await page.getByRole("button", { name: "Exchange and end turn" }).click();
  await handoff(page);
  for (let i = 1; i < 6; i++) {
    await page.getByRole("button", { name: "Pass", exact: true }).click();
    await page.getByRole("button", { name: "Confirm pass" }).click();
    if (i < 5) await handoff(page, i % 2 === 1 ? "Player 1" : "Player 2");
  }
  await expect(page.getByText("GAME OVER · FULL BOARD REVEALED")).toBeVisible();
  await page.screenshot({
    path: "test-results/final-board.png",
    fullPage: true,
  });
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /revealed/,
  );
  await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
  await expect(
    page.getByText(/Six consecutive scoreless turns\. Each/),
  ).toBeVisible();
});
test("offline cache includes dictionary, saves and resumes after offline reload", async ({
  page,
  context,
}) => {
  await setup(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.getByRole("button", { name: "Resume game", exact: true }).click();
  await page.getByRole("button", { name: "I’m Player 1 — Start turn" }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Offline ·/)).toBeVisible();
  await page.getByRole("button", { name: "Resume game", exact: true }).click();
  await page.getByRole("button", { name: "I’m Player 1 — Start turn" }).click();
  await opening(page);
  await expect(
    page.getByText("Saved on this device", { exact: false }),
  ).toBeVisible();
});
test("Phone boards fit and desktop keeps rack and Submit in view", async ({
  page,
}) => {
  await setup(page);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const board = await page
      .getByRole("group", { name: "Word board, 15 rows and 15 columns" })
      .boundingBox();
    expect(board!.width + board!.x).toBeLessThanOrEqual(width);
    const tiles = page.getByRole("button", { name: /^Rack / });
    expect((await tiles.first().boundingBox())!.height).toBeGreaterThanOrEqual(
      44,
    );
  }
  await page.screenshot({
    path: "test-results/phone-game.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  const submit = await page
    .getByRole("button", { name: "Submit word" })
    .boundingBox();
  expect(submit!.y + submit!.height).toBeLessThanOrEqual(900);
  const rack = await page
    .getByRole("region", { name: "Your rack" })
    .boundingBox();
  expect(rack!.y).toBeLessThan(submit!.y);
});
test("storage failures warn without claiming the move was saved", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "indexedDB", {
      get() {
        throw Error("Storage blocked");
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await page.getByRole("button", { name: "Replace and start" }).click();
  await expect(page.getByRole("alert")).toContainText("could not save");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Submit word" })).toBeVisible();
});
test("mobile setup, game and dialogs pass automated accessibility scan", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "New game", exact: true }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await setup(page);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByTestId("cell-0").click();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("history leaves the current staged move intact and rack shuffle preserves identities", async ({
  page,
}) => {
  await setup(page);
  await opening(page);
  await handoff(page);
  const first = page.getByRole("button", { name: /^Rack / }).first();
  const label = await first.getAttribute("aria-label");
  const original = (
    await page.getByRole("button", { name: /^Rack / }).allTextContents()
  ).sort();
  await first.click();
  await page.getByTestId("cell-0").click();
  const staged = await page.getByTestId("cell-0").getAttribute("aria-label");
  await page.getByRole("button", { name: "History", exact: false }).click();
  await page.getByRole("button", { name: /#1 Player 1/ }).click();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /empty/,
  );
  await page.getByRole("button", { name: "Return to live board" }).click();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    staged!,
  );
  await page.getByRole("button", { name: "Shuffle", exact: true }).click();
  expect(
    (
      await page.getByRole("button", { name: /^Rack / }).allTextContents()
    ).sort(),
  ).toEqual(original);
  await page.getByRole("button", { name: "Recall", exact: true }).click();
  expect(label).toBeTruthy();
  await expect(page.getByTestId("cell-0")).toHaveAttribute(
    "aria-label",
    /empty/,
  );
});
test("matching seeds and fixture actions give identical totals across reveal modes", async ({
  browser,
}) => {
  const totals: string[] = [];
  for (const mode of ["Score-only", "Reveal-used"]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await setup(page, mode);
    await opening(page);
    totals.push(await page.locator(".result h2").innerText());
    await expect(page.getByTestId("cell-113")).toHaveAttribute(
      "aria-label",
      mode === "Reveal-used" ? /consumed/ : /^I8, letter T, 1 points$/,
    );
    await context.close();
  }
  expect(totals[0]).toBe(totals[1]);
});

test("reload preserves the pending receipt until the mover explicitly passes the device", async ({
  page,
}) => {
  await setup(page);
  await opening(page);
  await page.reload();
  await page.getByRole("button", { name: "Resume game", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: "Resume game", exact: true }).click();
  await page
    .getByRole("button", { name: "I’m Player 1 — Review turn result" })
    .click();
  await expect(
    page.getByRole("button", { name: "Pass device", exact: true }),
  ).toBeVisible();
  await handoff(page);
});
test("storage failure export recovers the newest in-memory turn and Home reports unsaved state", async ({
  page,
}) => {
  const { readFile } = await import("node:fs/promises");
  await setup(page);
  await page.evaluate(() => {
    IDBObjectStore.prototype.put = function () {
      throw new DOMException("Disk full", "QuotaExceededError");
    };
  });
  await page.getByRole("button", { name: "Pass", exact: true }).click();
  await page.getByRole("button", { name: "Confirm pass" }).click();
  await expect(page.getByRole("alert")).toContainText("could not save");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved data" }).click();
  const data = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(data.turn).toBe(2);
  expect(data.moves.at(-1).type).toBe("PASS");
  await page.getByRole("button", { name: "Home / New game" }).click();
  await expect(page.getByRole("dialog")).toContainText("in memory");
  await expect(page.getByRole("dialog")).not.toContainText("game is saved");
});

test("320px blank picker, note labels and long-name handoff fit their controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await page.locator(".players-options summary").click();
  await page
    .getByLabel("Player 2", { exact: true })
    .fill("MaximilianTheMysteryWordMaster");
  await page.getByText("Developer fixtures", { exact: true }).click();
  await page.getByLabel("Starting rack").selectOption("blank");
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await place(page, "blank", 112);
  const dialog = page.getByRole("dialog");
  const bounds = (await dialog.boundingBox())!;
  for (const letter of "EJOTY") {
    const button = (await dialog
      .getByRole("button", { name: letter, exact: true })
      .boundingBox())!;
    expect(button.x + button.width).toBeLessThan(bounds.x + bounds.width - 10);
  }
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Notes", exact: true }).click();
  await page.getByTestId("cell-0").click();
  const fitsText = await page
    .getByRole("region", { name: "Private notes" })
    .getByRole("button", { name: "Ordinary", exact: true })
    .evaluate((el) => el.scrollWidth <= el.clientWidth);
  expect(fitsText).toBe(true);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.getByRole("button", { name: "Pass", exact: true }).click();
  await page.getByRole("button", { name: "Confirm pass" }).click();
  await page.getByRole("button", { name: "Pass device", exact: true }).click();
  const start = page.getByRole("button", {
    name: "I’m MaximilianTheMysteryWordMaster — Start turn",
  });
  expect(await start.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
    true,
  );
});

for (const mode of ["Score-only", "Reveal-used"])
  test(`fluid placement and post-score note-taking stay private: ${mode}`, async ({
    page,
  }) => {
    await setup(page, mode);
    await page.getByTestId("cell-112").click();
    await page.getByRole("button", { name: /^Rack A,/ }).click();
    await expect(page.getByTestId("cell-113")).toHaveAttribute(
      "aria-label",
      /placement cursor across/,
    );
    await page.getByRole("button", { name: "Down ↓", exact: true }).click();
    await page.getByRole("button", { name: /^Rack T,/ }).click();
    await expect(page.getByTestId("cell-127")).toHaveAttribute(
      "aria-label",
      /letter T/,
    );
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(page.getByTestId("cell-127")).toHaveAttribute(
      "aria-label",
      /empty/,
    );
    await page.getByRole("button", { name: "Recall", exact: true }).click();
    await page.getByRole("button", { name: "Across →", exact: true }).click();
    await page.getByTestId("cell-112").click();
    await page.getByRole("button", { name: /^Rack A,/ }).click();
    await page.getByRole("button", { name: /^Rack T,/ }).click();
    await page.getByRole("button", { name: "Submit word" }).click();
    const editor = page.getByRole("region", { name: "Private notes" });
    await expect(editor).toBeVisible();
    await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
    await expect(editor).toContainText(
      mode === "Reveal-used" ? "Observed:" : "Bonus hidden",
    );
    await editor.getByRole("button", { name: "TL", exact: true }).click();
    await expect(page.getByTestId("cell-111")).toHaveAttribute(
      "aria-label",
      /your note/,
    );
    await page.getByTestId("cell-0").click();
    await editor.getByRole("button", { name: "TW", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByTestId("cell-224")).toHaveAttribute(
      "aria-label",
      /your note/,
    );
    await expect(
      page.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await page
      .getByRole("button", { name: "Resume game", exact: true })
      .click();
    await page
      .getByRole("button", { name: "I’m Player 1 — Review turn result" })
      .click();
    await page.getByRole("button", { name: "Notes", exact: true }).click();
    await page.getByTestId("cell-113").click();
    await expect(
      editor.getByRole("button", { name: "TL", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await handoff(page);
    await page.getByRole("button", { name: "Notes", exact: true }).click();
    await page.getByTestId("cell-113").click();
    await expect(
      editor.getByRole("button", { name: "TL", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Pass", exact: true }).click();
    await page.getByRole("button", { name: "Confirm pass" }).click();
    await handoff(page, "Player 1");
    await page.getByTestId("cell-111").click();
    await page
      .getByRole("button", { name: /^Rack C,/ })
      .first()
      .click();
    await expect(page.getByTestId("cell-114")).toHaveAttribute(
      "aria-label",
      /placement cursor across/,
    );
    await page
      .getByRole("button", { name: /^Rack S,/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Submit word" }).click();
    await expect(
      page.getByRole("button", { name: "Pass device", exact: true }),
    ).toBeVisible();
  });
