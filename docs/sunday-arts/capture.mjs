import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";
import assert from "node:assert/strict";

const baseURL = process.env.PREVIEW_URL || "http://127.0.0.1:4181";
const homeOnly = process.argv.includes("--home");
const directory = new URL("./screenshots/", import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
});
try {
  for (const width of [320, 390, 430, 1280]) {
    const page = await browser.newPage({
      viewport: { width, height: width === 1280 ? 900 : 844 },
      deviceScaleFactor: 2,
      isMobile: width < 600,
      hasTouch: width < 600,
    });
    const capture = (name) =>
      page.screenshot({
        path: new URL(`${name}-${width}.png`, directory).pathname,
        fullPage: true,
      });
    await page.goto(baseURL);
    await page.getByRole("button", { name: "New game", exact: true }).waitFor();
    if (homeOnly) {
      assert.equal(
        await page.getByText("Developer fixtures", { exact: true }).count(),
        0,
        "Home captures require a normal production build.",
      );
      await capture("home");
      await page.getByRole("button", { name: "New game", exact: true }).click();
      await page.getByRole("button", { name: "Home / New game" }).click();
      await page
        .getByRole("button", { name: "Return home", exact: true })
        .click();
      await capture("resume");
    } else {
      await page.getByText("Developer fixtures", { exact: true }).click();
      await page.getByLabel("Seed", { exact: true }).fill("sunday-arts");
      await page.getByLabel("Starting rack").selectOption("opening");
      await page.getByRole("radio", { name: /Reveal-used/ }).check();
      await page.getByRole("button", { name: "New game", exact: true }).click();
      await page.getByTestId("cell-112").click();
      for (const letter of "CATERS")
        await page
          .getByRole("button", { name: new RegExp(`^Rack ${letter},`) })
          .click();
      await capture("board");
      await page.getByRole("button", { name: "Submit word" }).click();
      const editor = page.getByRole("region", { name: "Private notes" });
      await editor.getByRole("button", { name: "TL", exact: true }).click();
      await page.getByTestId("cell-98").click();
      await editor.getByLabel("Multiple possibilities").check();
      await editor.getByRole("button", { name: "DL", exact: true }).click();
      await editor.getByRole("button", { name: "TW", exact: true }).click();
      await page.getByTestId("cell-113").click();
      await capture("notes");
      if (width <= 390) {
        await page.getByRole("button", { name: /Enlarge/ }).click();
        await capture("enlarged-notes");
      }
      await page
        .getByRole("button", { name: "Pass device", exact: true })
        .click();
      await capture("handoff");
    }
    await page.close();
  }
} finally {
  await browser.close();
}
