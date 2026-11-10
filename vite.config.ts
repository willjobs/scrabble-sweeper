import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
const base = process.env.BASE_PATH || "/";
const build = process.env.APP_BUILD_ID || process.env.GITHUB_SHA || "local";
export default defineConfig({
  base,
  define: { __APP_BUILD__: JSON.stringify(build) },
  plugins: [
    {
      name: "app-build",
      transformIndexHtml: {
        handler: () => [
          {
            tag: "meta",
            attrs: { name: "app-build", content: build },
            injectTo: "head",
          },
        ],
      },
      generateBundle() {
        this.emitFile({
          type: "asset",
          fileName: "version.json",
          source: JSON.stringify({ build }),
        });
      },
    },
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Tile Theory",
        short_name: "Tile Theory",
        description: "A game of words, symmetry and hidden bonuses.",
        theme_color: "#f7f1e7",
        background_color: "#f7f1e7",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5000000,
      },
    }),
  ],
});
