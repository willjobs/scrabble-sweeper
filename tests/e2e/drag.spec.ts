import {
  expect,
  test,
  type Page,
  type Locator,
  type CDPSession,
} from "@playwright/test";

async function setup(page: Page, blank = false) {
  await page.goto("/");
  await page.getByText("Developer fixtures", { exact: true }).click();
  await page
    .getByLabel("Starting rack")
    .selectOption(blank ? "blank" : "opening");
  await page.getByText("Developer fixtures", { exact: true }).click();
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit word" })).toBeVisible();
}
const rack = (page: Page, letter: string) =>
  page.getByRole("button", { name: new RegExp(`^Rack ${letter},`) });
const cell = (page: Page, at: number) => page.getByTestId(`cell-${at}`);
async function center(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
async function mouseDrag(
  page: Page,
  source: Locator,
  destination: Locator,
  release = true,
) {
  await source.scrollIntoViewIfNeeded();
  const from = await center(source),
    to = await center(destination);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 12 });
  if (release) await page.mouse.up();
}
async function touchStart(page: Page, client: CDPSession, source: Locator) {
  await source.scrollIntoViewIfNeeded();
  const from = await center(source);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ ...from, id: 1 }],
  });
}
async function touchMove(client: CDPSession, point: { x: number; y: number }) {
  await client.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ ...point, id: 1 }],
  });
}
async function touchDrag(
  page: Page,
  client: CDPSession,
  source: Locator,
  destination: Locator,
) {
  await source.scrollIntoViewIfNeeded();
  const from = await center(source),
    to = await center(destination);
  // A complete native gesture avoids leaving Chrome's raw-touch fling state active.
  await client.send("Input.synthesizeScrollGesture", {
    x: from.x,
    y: from.y,
    xDistance: to.x - from.x,
    yDistance: to.y - from.y,
    gestureSourceType: "touch",
    speed: 800,
    preventFling: true,
  });
}
async function touchTap(page: Page, client: CDPSession, target: Locator) {
  // Keep taps and drags on one CDP input stream, as with a real finger.
  await touchStart(page, client, target);
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

test("mouse dragging shares placement, movement, recall and undo with clicks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await setup(page);
  await mouseDrag(page, rack(page, "A"), cell(page, 112));
  await expect(cell(page, 112)).toHaveAttribute("aria-label", /letter A/);
  await expect(rack(page, "A")).toHaveAttribute("aria-pressed", "false");
  await rack(page, "T").click();
  await expect(cell(page, 113)).toHaveAttribute("aria-label", /letter T/);
  await mouseDrag(page, rack(page, "C"), cell(page, 112));
  await expect(cell(page, 112)).toHaveAttribute("aria-label", /letter A/);
  await expect(rack(page, "C")).not.toHaveAttribute("aria-label", /staged/);
  await mouseDrag(page, cell(page, 112), page.locator(".masthead"));
  await expect(cell(page, 112)).toHaveAttribute("aria-label", /letter A/);
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  await mouseDrag(page, cell(page, 113), cell(page, 128));
  await expect(cell(page, 113)).toHaveAttribute("aria-label", /empty/);
  await expect(cell(page, 128)).toHaveAttribute("aria-label", /letter T/);
  await mouseDrag(page, cell(page, 128), page.locator(".rack"));
  await expect(cell(page, 128)).toHaveAttribute("aria-label", /empty/);
  await expect(rack(page, "T")).not.toHaveAttribute("aria-label", /staged/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(cell(page, 128)).toHaveAttribute("aria-label", /letter T/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(cell(page, 113)).toHaveAttribute("aria-label", /letter T/);
  await page.getByRole("button", { name: "Recall", exact: true }).click();
  await expect(cell(page, 112)).toHaveAttribute("aria-label", /empty/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(cell(page, 112)).toHaveAttribute("aria-label", /letter A/);
  await expect(cell(page, 113)).toHaveAttribute("aria-label", /letter T/);
});

test("cancelled drags, blank choices and committed tiles remain correct", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await setup(page, true);
  await cell(page, 0).click();
  await mouseDrag(page, rack(page, "blank"), cell(page, 112));
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: /Enlarge/ })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(cell(page, 112)).toHaveAttribute("aria-label", /empty/);
  await expect(page.getByRole("button", { name: /Enlarge/ })).toBeVisible();
  await mouseDrag(page, rack(page, "blank"), cell(page, 112));
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "A", exact: true })
    .click();
  await expect(cell(page, 112)).toHaveAttribute(
    "aria-label",
    /letter A, 0 points, blank/,
  );
  await expect(
    page.getByRole("button", { name: "Fit board", exact: true }),
  ).toBeVisible();
  await expect(cell(page, 0)).toHaveAttribute("aria-label", /empty/);
  await mouseDrag(page, cell(page, 112), cell(page, 127));
  await expect(cell(page, 127)).toHaveAttribute(
    "aria-label",
    /letter A, 0 points, blank/,
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await mouseDrag(page, cell(page, 127), cell(page, 128), false);
  await expect(page.locator(".drag-ghost")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(cell(page, 127)).toHaveAttribute("aria-label", /letter A/);
  await expect(cell(page, 128)).toHaveAttribute("aria-label", /empty/);
  await mouseDrag(page, cell(page, 127), cell(page, 112));
  await rack(page, "T").click();
  await page.getByRole("button", { name: "Submit word" }).click();
  await expect(
    page.getByRole("region", { name: "Private notes" }),
  ).toBeVisible();
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
  await page.getByRole("button", { name: "Pass device", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
  await page.getByRole("button", { name: "I’m Player 2 — Start turn" }).click();
  await mouseDrag(page, cell(page, 112), cell(page, 127));
  await expect(cell(page, 112)).toHaveAttribute(
    "aria-label",
    /letter A, 0 points, blank/,
  );
  await expect(cell(page, 127)).toHaveAttribute("aria-label", /empty/);
  await expect(page.locator(".drag-ghost")).toHaveCount(0);
});

test("dragging pans an enlarged board to reach an offscreen square", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await setup(page);
  await cell(page, 112).click();
  await page.getByRole("button", { name: /Enlarge/ }).click();
  const viewport = page.locator(".board-viewport");
  await rack(page, "A").scrollIntoViewIfNeeded();
  const source = await center(rack(page, "A"));
  const frame = (await viewport.boundingBox())!;
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(
    frame.x + frame.width - 10,
    frame.y + frame.height / 2,
    { steps: 8 },
  );
  await expect
    .poll(() =>
      viewport.evaluate(
        (el) => el.scrollWidth - el.clientWidth - el.scrollLeft,
      ),
    )
    .toBeLessThanOrEqual(1);
  const destination = await center(cell(page, 119));
  await page.screenshot({
    path: "test-results/drag-enlarged.png",
    fullPage: true,
  });
  await page.mouse.move(destination.x, destination.y);
  await page.mouse.up();
  await expect(cell(page, 119)).toHaveAttribute("aria-label", /letter A/);
  await expect(rack(page, "A")).toHaveAttribute("aria-pressed", "false");
});

test.describe("native touch dragging", () => {
  test.use({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  test("touch dragging, tapping and pointer cancellation work together", async ({
    page,
    context,
  }) => {
    await setup(page);
    // Native scroll gestures include touch slop; enlarged squares are the
    // precision touch surface. The separate raw-pointer test covers fit mode.
    await page.getByRole("button", { name: /Enlarge/ }).click();
    const client = await context.newCDPSession(page);
    await touchDrag(page, client, rack(page, "A"), cell(page, 112));
    await expect(cell(page, 112)).toHaveAttribute("aria-label", /letter A/);
    await expect(rack(page, "A")).toHaveAttribute("aria-pressed", "false");
    await touchTap(page, client, rack(page, "T"));
    await expect(cell(page, 113)).toHaveAttribute("aria-label", /letter T/);
    await touchStart(page, client, rack(page, "C"));
    await touchMove(client, await center(cell(page, 127)));
    await expect(page.locator(".drag-ghost")).toBeVisible();
    await page.screenshot({
      path: "test-results/drag-touch.png",
      fullPage: true,
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchCancel",
      touchPoints: [],
    });
    await expect(page.locator(".drag-ghost")).toHaveCount(0);
    await expect(rack(page, "C")).not.toHaveAttribute("aria-label", /staged/);
    await touchDrag(page, client, cell(page, 112), cell(page, 127));
    await expect(cell(page, 127)).toHaveAttribute("aria-label", /letter A/);
    await touchDrag(page, client, cell(page, 127), page.locator(".rack"));
    await expect(cell(page, 127)).toHaveAttribute("aria-label", /empty/);
    await touchTap(
      page,
      client,
      page.getByRole("button", { name: "Undo", exact: true }),
    );
    await touchDrag(page, client, cell(page, 127), cell(page, 112));
    await touchTap(
      page,
      client,
      page.getByRole("button", { name: "Submit word" }),
    );
    await expect(
      page.getByRole("region", { name: "Private notes" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
  });
  test("touch placement reaches the board without scrolling the page", async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 320, height: 540 });
    await setup(page);
    const client = await context.newCDPSession(page);
    await touchStart(page, client, rack(page, "A"));
    expect(await page.evaluate(() => scrollY)).toBe(0);
    await touchMove(client, await center(cell(page, 0)));
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await expect(cell(page, 0)).toHaveAttribute("aria-label", /letter A/);
    await expect(rack(page, "A")).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("button", { name: "Fit board", exact: true }),
    ).toBeVisible();
    await expect(cell(page, 0)).toBeInViewport();
    expect((await cell(page, 0).boundingBox())!.width).toBeGreaterThanOrEqual(
      44,
    );
  });
});

for (const width of [320, 390])
  test(`placement zooms to its area after tapping or dropping at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await setup(page);
    await cell(page, 158).click();
    await expect(page.getByRole("button", { name: /Enlarge/ })).toBeVisible();
    await rack(page, "A").click();
    await expect(
      page.getByRole("button", { name: "Fit board", exact: true }),
    ).toBeVisible();
    const frame = await center(page.locator(".board-viewport"));
    const placed = await center(cell(page, 158));
    expect(Math.abs(placed.x - frame.x)).toBeLessThan(4);
    expect(Math.abs(placed.y - frame.y)).toBeLessThan(4);
    await expect(cell(page, 159)).toBeInViewport();
    expect((await cell(page, 158).boundingBox())!.width).toBeGreaterThanOrEqual(
      44,
    );
    if (width === 390)
      await page.screenshot({
        path: "test-results/auto-zoom-phone.png",
        fullPage: true,
      });

    await page.getByRole("button", { name: "Fit board", exact: true }).click();
    await cell(page, 0).click();
    await expect(page.getByRole("button", { name: /Enlarge/ })).toBeVisible();
    await mouseDrag(page, rack(page, "T"), cell(page, 0), false);
    await expect(page.locator(".drag-ghost")).toBeVisible();
    // Changing scale during a drag would move the square out from under the finger.
    await expect(page.getByRole("button", { name: /Enlarge/ })).toBeVisible();
    await page.mouse.up();
    await expect(cell(page, 0)).toHaveAttribute("aria-label", /letter T/);
    await expect(
      page.getByRole("button", { name: "Fit board", exact: true }),
    ).toBeVisible();
    await expect(cell(page, 0)).toBeInViewport();

    await page.getByRole("button", { name: "Fit board", exact: true }).click();
    await mouseDrag(page, cell(page, 0), cell(page, 224));
    await expect(cell(page, 224)).toHaveAttribute("aria-label", /letter T/);
    await expect(cell(page, 0)).toHaveAttribute("aria-label", /empty/);
    await expect(
      page.getByRole("button", { name: "Fit board", exact: true }),
    ).toBeVisible();
    await expect(cell(page, 224)).toBeInViewport();
    expect((await cell(page, 224).boundingBox())!.width).toBeGreaterThanOrEqual(
      44,
    );
  });
