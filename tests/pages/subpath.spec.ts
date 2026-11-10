import { expect, test } from "@playwright/test";
test("Pages subpath serves production assets, scoped PWA and offline resume", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("./");
  await expect(
    page.getByRole("heading", { name: "Tile Theory" }),
  ).toBeVisible();
  await expect(
    page.getByText("Developer fixtures", { exact: true }),
  ).toHaveCount(0);
  const links = await page.evaluate(() => ({
    manifest: (
      document.querySelector('link[rel="manifest"]') as HTMLLinkElement
    ).href,
    icon: (
      document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement
    ).href,
  }));
  expect(new URL(links.manifest).pathname).toBe(
    "/tile-theory/manifest.webmanifest",
  );
  expect(new URL(links.icon).pathname).toBe("/tile-theory/icons/icon-192.png");
  const response = await page.request.get(links.manifest);
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.name).toBe("Tile Theory");
  expect(manifest.short_name).toBe("Tile Theory");
  expect(manifest.start_url).toBe("/tile-theory/");
  expect(manifest.scope).toBe("/tile-theory/");
  for (const icon of manifest.icons) {
    expect(
      (await page.request.get(new URL(icon.src, links.manifest).href)).ok(),
    ).toBe(true);
  }
  const scope = await page.evaluate(
    async () => (await navigator.serviceWorker.ready).scope,
  );
  expect(new URL(scope).pathname).toBe("/tile-theory/");
  await page.getByRole("button", { name: "New game", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit word" })).toBeVisible();
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Resume game", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(0);
  await page.getByRole("button", { name: "I’m Player 1 — Start turn" }).click();
  await expect(page.getByRole("button", { name: /^Rack / })).toHaveCount(7);
  expect(errors).toEqual([]);
});
