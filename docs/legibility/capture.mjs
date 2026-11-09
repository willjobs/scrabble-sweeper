import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import process from "node:process";
import { URL } from "node:url";

// Run against a VITE_DEV_TOOLS=1 build, after browser tests finish.
const baseURL = process.env.PREVIEW_URL || "http://127.0.0.1:4181";
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
    await page.goto(baseURL);
    await page.getByText("Developer fixtures", { exact: true }).click();
    await page.getByLabel("Seed", { exact: true }).fill("legibility-phone");
    await page.getByLabel("Starting rack").selectOption("opening");
    await page.getByRole("radio", { name: /Reveal-used/ }).check();
    await page.getByRole("button", { name: "New game", exact: true }).click();
    await page.getByTestId("cell-112").click();
    for (const letter of "CATERS")
      await page
        .getByRole("button", { name: new RegExp(`^Rack ${letter},`) })
        .click();
    await page.screenshot({
      path: new URL(`letters-${width}.png`, directory).pathname,
      fullPage: true,
    });
    if (width === 390) {
      await page.getByRole("button", { name: /Enlarge/ }).click();
      await page.screenshot({
        path: new URL("enlarged-letters-390.png", directory).pathname,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Fit board", exact: true })
        .click();
    }
    await page.getByRole("button", { name: "Submit word" }).click();
    const editor = page.getByRole("region", { name: "Private notes" });
    await editor.getByRole("button", { name: "TL", exact: true }).click();
    await page.getByTestId("cell-83").click();
    await editor.getByRole("button", { name: "DW", exact: true }).click();
    await page.getByTestId("cell-98").click();
    await editor.getByLabel("Multiple possibilities").check();
    await editor.getByRole("button", { name: "DL", exact: true }).click();
    await editor.getByRole("button", { name: "TW", exact: true }).click();
    await page.getByTestId("cell-113").click();
    await page.screenshot({
      path: new URL(`notes-${width}.png`, directory).pathname,
      fullPage: true,
    });
    if (width <= 390) {
      await page.getByRole("button", { name: /Enlarge/ }).click();
      await page.screenshot({
        path: new URL(`enlarged-notes-${width}.png`, directory).pathname,
        fullPage: true,
      });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
