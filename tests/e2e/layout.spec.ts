import { expect, test, type Page } from "@playwright/test";

const windows = [
  [1280, 800],
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [390, 667],
  [393, 635],
  [320, 568],
  [844, 390],
];

async function fitsWindow(page: Page) {
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - innerWidth,
    y: document.documentElement.scrollHeight - innerHeight,
  }));
  expect(overflow.x).toBeLessThanOrEqual(1);
  expect(overflow.y).toBeLessThanOrEqual(1);
}

async function clearPlaySurface(page: Page) {
  await fitsWindow(page);
  const issues = await page.evaluate(() => {
    const board = document
      .querySelector(".board-viewport")!
      .getBoundingClientRect();
    const problems: string[] = [];
    if (
      board.width < 120 ||
      board.height < 120 ||
      board.y < 0 ||
      board.bottom > innerHeight + 1
    )
      problems.push("board is too small or outside the window");
    for (const selector of [
      ".score-strip",
      ".toolbar",
      ".rack-area",
      ".annotation-dock",
      ".result",
    ]) {
      const el = document.querySelector(selector);
      if (!el || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (
        Math.min(r.right, board.right) - Math.max(r.left, board.left) > 1 &&
        Math.min(r.bottom, board.bottom) - Math.max(r.top, board.top) > 1
      )
        problems.push(`${selector} overlaps the board`);
      if (r.bottom > innerHeight + 1 || r.y < 0 || r.right > innerWidth + 1)
        problems.push(`${selector} is outside the window`);
    }
    return problems;
  });
  expect(issues).toEqual([]);
}

for (const [width, height] of windows)
  test(`home and game fit ${width}×${height} without collisions`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    const start = page.getByRole("button", { name: "New game", exact: true });
    await expect(start).toBeVisible();
    await fitsWindow(page);
    expect(
      await page.evaluate(() => {
        const box = (s: string) =>
          document.querySelector(s)!.getBoundingClientRect();
        const cover = box(".game-cover"),
          controls = box(".setup-controls");
        const separate =
          Math.min(cover.right, controls.right) -
            Math.max(cover.left, controls.left) <=
            1 ||
          Math.min(cover.bottom, controls.bottom) -
            Math.max(cover.top, controls.top) <=
            1;
        return (
          separate &&
          box(".masthead").bottom <= Math.min(cover.top, controls.top) + 1 &&
          Math.max(cover.bottom, controls.bottom) <= box("footer").top + 1
        );
      }),
    ).toBe(true);
    await page
      .getByRole("button", { name: "Who’s playing?", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Who’s playing?" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByText("Developer fixtures", { exact: true }).click();
    await page.getByLabel("Starting rack").selectOption("opening");
    await page.getByText("Developer fixtures", { exact: true }).click();
    await start.click();
    await expect(
      page.getByRole("button", { name: "Submit word" }),
    ).toBeVisible();
    await clearPlaySurface(page);
    if (width <= 639) {
      expect(
        (await page.locator(".board").boundingBox())!.width,
      ).toBeGreaterThanOrEqual(width - 24);
      for (const button of await page.locator(".action-row button").all()) {
        if (!(await button.isVisible())) continue;
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
    if (width === 393) {
      await page.getByRole("button", { name: "More", exact: true }).click();
      await page
        .getByRole("button", { name: "App status & updates", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "App status & updates" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "More", exact: true }),
      ).toBeFocused();
      await page.getByRole("button", { name: "Notes", exact: true }).click();
      const emptyFrame = (await page.locator(".board-viewport").boundingBox())!;
      await expect(
        page.getByRole("button", { name: "DW", exact: true }),
      ).toBeDisabled();
      await page.getByTestId("cell-145").click();
      expect((await page.locator(".board-viewport").boundingBox())!.width).toBe(
        emptyFrame.width,
      );
      await page.getByRole("button", { name: "DW", exact: true }).click();
      await expect(page.getByTestId("cell-145")).toHaveAttribute(
        "data-premium",
        "DW",
      );
      await page
        .getByRole("button", { name: "Note options", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Note options" })
        .getByRole("button", { name: "Reset to unknown", exact: true })
        .click();
      await expect(page.getByTestId("cell-145")).not.toHaveAttribute(
        "data-premium",
      );
      await expect(
        page.getByRole("button", { name: "Note options", exact: true }),
      ).toBeFocused();
      await page.getByTestId("cell-112").click();
      await expect(
        page.getByRole("button", { name: "TW", exact: true }),
      ).toBeDisabled();
      await page.getByRole("button", { name: "Play", exact: true }).click();
    }
    const rack = page.getByRole("button", { name: /^Rack / }).first();
    expect((await rack.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByTestId("cell-112").click();
    await page.getByRole("button", { name: /^Rack A,/ }).click();
    await page.getByRole("button", { name: /^Rack T,/ }).click();
    await expect(
      page.getByRole("button", { name: "Fit board", exact: true }),
    ).toBeVisible();
    if (width === 393) {
      await page.getByTestId("cell-112").click();
      await page.getByRole("button", { name: "More", exact: true }).click();
      await page
        .getByRole("button", { name: "Remove tile", exact: true })
        .click();
      await expect(page.getByTestId("cell-112")).toHaveAttribute(
        "aria-label",
        /empty/,
      );
      await expect(page.getByTestId("cell-113")).toHaveAttribute(
        "aria-label",
        /letter T/,
      );
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      await expect(page.getByTestId("cell-112")).toHaveAttribute(
        "aria-label",
        /letter A/,
      );
    }
    await clearPlaySurface(page);
    expect(
      (await page.getByTestId("cell-113").boundingBox())!.width,
    ).toBeGreaterThanOrEqual(44);
    await page.getByRole("button", { name: "Notes", exact: true }).click();
    const beforeSelection = await page.locator(".board-viewport").boundingBox();
    await page.getByTestId("cell-113").click();
    await clearPlaySurface(page);
    if (width <= 639) {
      const frame = (await page.locator(".board-viewport").boundingBox())!;
      expect(frame.width).toBeGreaterThanOrEqual(width - 12);
      expect(frame.width).toBeCloseTo(beforeSelection!.width, 1);
      expect(frame.y).toBeCloseTo(beforeSelection!.y, 1);
      expect(
        (await page.locator(".annotation-dock").boundingBox())!.height,
      ).toBeLessThanOrEqual(105);
      const colors = await page
        .locator('.quick-notes button[data-premium]:not([data-premium="NONE"])')
        .evaluateAll((buttons) =>
          buttons.map((b) => getComputedStyle(b).backgroundColor),
        );
      expect(new Set(colors).size).toBe(4);
    }
    await page.getByRole("button", { name: "TL", exact: true }).click();
    await page.getByRole("button", { name: "Play", exact: true }).click();
    await page.getByRole("button", { name: "Submit word" }).click();
    await expect(
      page.getByRole("button", { name: "Pass device", exact: true }),
    ).toBeVisible();
    await clearPlaySurface(page);
    if (width <= 639) {
      expect(
        (await page.locator(".board-viewport").boundingBox())!.width,
      ).toBeGreaterThanOrEqual(width - 12);
    }
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Resume game", exact: true }),
    ).toBeVisible();
    await fitsWindow(page);
    await page
      .getByRole("button", { name: "App status & updates", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "App status & updates" }),
    ).toBeVisible();
    await fitsWindow(page);
  });
