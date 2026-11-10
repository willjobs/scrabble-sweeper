import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import type { AddressInfo } from "node:net";

test("a missing entry bundle offers recovery without deleting the game or other app caches", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ serviceWorkers: "block" });
  const page = await context.newPage();
  try {
    await page.goto(baseURL!);
    await page.getByRole("button", { name: "New game", exact: true }).click();
    await expect(
      page.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    const scope = new URL(baseURL!).href;
    const own = `workbox-test-${scope}`;
    const other = `workbox-test-${new URL("/another-game/", scope).href}`;
    await page.evaluate(
      async ([own, other]) => {
        await caches.open(own);
        await caches.open(other);
      },
      [own, other],
    );
    await page.route("**/assets/index-*.js", (route) => route.abort());
    await page.reload();
    await expect(
      page.getByText("The game couldn’t finish loading.", { exact: false }),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/cache-recovery.png",
      fullPage: true,
    });
    await context.setOffline(true);
    await page
      .getByRole("button", { name: "Refresh app", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Refresh app", exact: true }),
    ).toBeEnabled();
    expect(await page.evaluate(() => caches.keys())).toContain(own);
    await context.setOffline(false);
    const staleHTML = /\/tile-theory\/\?refresh=/;
    await page.route(staleHTML, (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<script type="module" src="/src/main.tsx"></script>',
      }),
    );
    await page
      .getByRole("button", { name: "Refresh app", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Refresh app", exact: true }),
    ).toBeEnabled();
    expect(await page.evaluate(() => caches.keys())).toContain(own);
    await page.unroute(staleHTML);
    await page.unroute("**/assets/index-*.js");
    await page
      .getByRole("button", { name: "Refresh app", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Resume game", exact: true }),
    ).toBeVisible();
    const names = await page.evaluate(() => caches.keys());
    expect(names).not.toContain(own);
    expect(names).toContain(other);
    await page
      .getByRole("button", { name: "Resume game", exact: true })
      .click();
    await page
      .getByRole("button", { name: "I’m Player 1 — Start turn" })
      .click();
    await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(7);
  } finally {
    await context.close();
  }
});

test("an update waits for consent and does not interrupt another tab's pending move", async ({
  context,
  page,
}) => {
  let revision = 1;
  const directory = resolve("dist");
  const types: Record<string, string> = {
    ".js": "text/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
  };
  // A real server is needed: browser routing cannot intercept SW update scripts.
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url!, "http://localhost").pathname;
      if (!path.startsWith("/tile-theory/")) {
        response.writeHead(404).end();
        return;
      }
      const file = resolve(
        directory,
        path.slice("/tile-theory/".length) || "index.html",
      );
      if (!file.startsWith(directory + "/")) {
        response.writeHead(404).end();
        return;
      }
      let body = await readFile(file);
      if (path.endsWith("/sw.js"))
        body = Buffer.from(`${body.toString()}\n// test revision ${revision}`);
      response.writeHead(200, {
        "content-type": types[extname(file)] || "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = `http://127.0.0.1:${(server.address() as AddressInfo).port}/tile-theory/`;
  try {
    await page.goto(address);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await page.getByRole("button", { name: "New game", exact: true }).click();
    await expect(
      page.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    await page.getByTestId("cell-112").click();
    await page
      .getByRole("button", { name: /^Rack / })
      .first()
      .click();
    if (await page.getByRole("dialog").count())
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "A", exact: true })
        .click();
    const staged = await page
      .getByTestId("cell-112")
      .getAttribute("aria-label");
    const other = await context.newPage();
    await other.goto(address);
    await expect(
      other.getByRole("button", { name: "Resume game", exact: true }),
    ).toBeVisible();
    revision = 2;
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())!.update();
    });
    await expect(page.getByText("A new version is ready.")).toBeVisible();
    await expect(other.getByText("A new version is ready.")).toBeVisible();
    await expect(page.getByTestId("cell-112")).toHaveAttribute(
      "aria-label",
      staged!,
    );
    await page.screenshot({
      path: "test-results/update-notice.png",
      fullPage: true,
    });
    await Promise.all([
      other.waitForEvent("domcontentloaded"),
      other.getByRole("button", { name: "Reload & update" }).click(),
    ]);
    await expect(
      other.getByRole("button", { name: "Resume game", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("cell-112")).toHaveAttribute(
      "aria-label",
      staged!,
    );
    await page.getByRole("button", { name: "Reload & update" }).click();
    await expect(
      page.getByRole("button", { name: "Resume game", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Resume game", exact: true })
      .click();
    await page
      .getByRole("button", { name: "I’m Player 1 — Start turn" })
      .click();
    await expect(page.getByTestId("cell-112")).toHaveAttribute(
      "aria-label",
      /empty/,
    );
    await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(7);
    await other.close();
  } finally {
    await page.close();
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});
