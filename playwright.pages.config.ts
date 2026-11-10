import { defineConfig } from "@playwright/test";
import config from "./playwright.config";
export default defineConfig({
  ...config,
  testDir: "tests/pages",
  use: { ...config.use, baseURL: "http://127.0.0.1:4174/tile-theory/" },
  webServer: {
    command:
      "BASE_PATH=/tile-theory/ npm run build && BASE_PATH=/tile-theory/ npm run preview -- --port 4174",
    url: "http://127.0.0.1:4174/tile-theory/",
    reuseExistingServer: false,
  },
});
