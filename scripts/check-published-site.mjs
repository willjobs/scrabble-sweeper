import assert from "node:assert/strict";
import process from "node:process";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { URL } from "node:url";
import { chromium, firefox } from "@playwright/test";

const log = (value) => process.stdout.write(`${JSON.stringify(value)}\n`);
const directory = "test-results/live";
await mkdir(directory, { recursive: true });
let address = process.env.LIVE_SITE_URL;
if (!address) {
  const settings = await globalThis.fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/pages`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
      signal: globalThis.AbortSignal.timeout(30000),
    },
  );
  assert.equal(
    settings.status,
    200,
    "Unable to read GitHub Pages configuration",
  );
  const metadata = await settings.json();
  address = metadata.html_url;
  log({ pages: { url: address, build_type: metadata.build_type } });
}
assert.ok(address, "Missing GitHub Pages URL");
const canonical = new URL(address);
if (!canonical.pathname.endsWith("/")) canonical.pathname += "/";
const fresh = new URL(canonical);
fresh.searchParams.set(
  "v",
  (process.env.GITHUB_SHA || "diagnostic").slice(0, 7),
);
const variants = [
  { name: "canonical", url: canonical.href },
  { name: "no-slash", url: canonical.href.replace(/\/$/, "") },
  { name: "fresh", url: fresh.href },
];
const results = [];
const cacheHeaders = (headers) =>
  Object.fromEntries(
    [
      "cache-control",
      "age",
      "cf-cache-status",
      "cf-ray",
      "etag",
      "content-type",
    ].map((key) => [key, headers[key] ?? null]),
  );
const compiled = (html) => {
  assert.doesNotMatch(
    html,
    /%BASE_URL%|src=["']\/src\/main\.tsx/,
    "Unbuilt source HTML was served",
  );
  assert.match(html, /<title>Tile Theory<\/title>/);
  const bundle = html.match(/<script[^>]+src=["']([^"']*\/assets\/[^"']+\.js)/);
  assert.ok(bundle, "Missing application bundle");
  return bundle[1];
};

// Retain diagnostics for every URL, even when one cache entry is broken.
for (const variant of variants) {
  let result = { kind: "http", ...variant };
  try {
    const response = await globalThis.fetch(variant.url, {
      signal: globalThis.AbortSignal.timeout(30000),
    });
    result = {
      ...result,
      finalURL: response.url,
      status: response.status,
      headers: cacheHeaders(Object.fromEntries(response.headers)),
    };
    log(result);
    assert.equal(response.status, 200);
    const module = compiled(await response.text());
    if (variant.name === "canonical") {
      const asset = async (url) => {
        const fetched = await globalThis.fetch(url, {
          signal: globalThis.AbortSignal.timeout(30000),
        });
        log({ asset: fetched.url, status: fetched.status });
        assert.equal(fetched.status, 200, `Failed asset: ${url}`);
        return fetched;
      };
      const bundle = await asset(new URL(module, response.url));
      assert.match(bundle.headers.get("content-type") || "", /javascript/);
      const manifestURL = new URL("manifest.webmanifest", response.url);
      const manifest = await (await asset(manifestURL)).json();
      assert.equal(manifest.start_url, new URL(response.url).pathname);
      assert.equal(manifest.scope, new URL(response.url).pathname);
      for (const icon of manifest.icons)
        await asset(new URL(icon.src, manifestURL));
      await asset(new URL("sw.js", response.url));
    }
    results.push({ ...result, ok: true });
  } catch (error) {
    results.push({ ...result, ok: false, error: String(error) });
  }
}

const engines = { chromium, firefox };
for (const engine of (process.env.SMOKE_BROWSERS || "chromium,firefox").split(
  ",",
)) {
  assert.ok(engines[engine], `Unsupported smoke browser: ${engine}`);
  const browser = await engines[engine].launch({
    executablePath:
      engine === "chromium"
        ? process.env.CHROMIUM_PATH ||
          (!process.env.CI && existsSync("/usr/bin/chromium")
            ? "/usr/bin/chromium"
            : undefined)
        : undefined,
  });
  try {
    for (const variant of variants) {
      // Fresh storage and no service worker expose the actual CDN response.
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const failures = [];
      const pageErrors = [];
      const badResponses = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) =>
        failures.push({
          url: request.url(),
          error: request.failure()?.errorText,
        }),
      );
      page.on("response", (response) => {
        if (response.status() >= 400)
          badResponses.push({ url: response.url(), status: response.status() });
      });
      let result = { kind: engine, ...variant };
      try {
        const response = await page.goto(variant.url, {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        assert.ok(response, "Missing navigation response");
        result = {
          ...result,
          finalURL: page.url(),
          status: response.status(),
          headers: cacheHeaders(await response.allHeaders()),
        };
        log(result);
        assert.equal(response.status(), 200);
        if (!process.env.LIVE_SITE_URL)
          assert.equal(new URL(page.url()).protocol, "https:");
        compiled(await response.text());
        await page
          .getByRole("heading", { name: "Tile Theory", exact: true })
          .waitFor({ timeout: 20000 });
        await page.screenshot({
          path: `${directory}/${engine}-${variant.name}-home.png`,
          fullPage: true,
        });
        await page
          .getByRole("button", { name: "New game", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Submit word", exact: true })
          .waitFor();
        assert.equal(await page.locator(".board .cell").count(), 225);
        assert.equal(
          await page.getByRole("button", { name: /^Rack / }).count(),
          7,
        );
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
        assert.match(
          await page.getByTestId("cell-112").getAttribute("aria-label"),
          /letter /,
        );
        const origin = new URL(page.url()).origin;
        assert.deepEqual(pageErrors, []);
        assert.deepEqual(
          badResponses.filter((item) => new URL(item.url).origin === origin),
          [],
        );
        assert.deepEqual(
          failures.filter((item) => new URL(item.url).origin === origin),
          [],
        );
        await page.screenshot({
          path: `${directory}/${engine}-${variant.name}-board.png`,
          fullPage: true,
        });
        results.push({ ...result, ok: true, failures });
      } catch (error) {
        await page
          .screenshot({
            path: `${directory}/${engine}-${variant.name}-failure.png`,
            fullPage: true,
          })
          .catch(() => {});
        results.push({
          ...result,
          ok: false,
          error: String(error),
          failures,
          badResponses,
          pageErrors,
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}
await writeFile(`${directory}/report.json`, JSON.stringify(results, null, 2));
results.forEach(log);
assert.ok(
  results.every((result) => result.ok),
  "Published-site checks failed; inspect the URL/cache diagnostics and screenshots.",
);
log({
  verified: canonical.href,
  browsers: process.env.SMOKE_BROWSERS || "chromium,firefox",
});
