# Veiled Words

A complete local, two-person, pass-and-play word game with a hidden, randomly generated bonus board. React + strict TypeScript + Vite; pure deterministic game engine; IndexedDB saves; offline PWA. No accounts, backend, analytics, solver or network dictionary.

## Run

Tested with Node **24.22.1** and npm **11.9.0** (Node ≥22 required).

```sh
npm ci
npm run dev
```

The project uses an ignored repo-local `.npm-cache/` so installation also works in workspaces with a read-only home directory.

Open the printed local URL. Production: `npm run build`, then `npm run preview`. The built static site is in `dist/`. Serve over HTTPS for offline/install features; localhost also works. No deployment credentials are required for development.

For a physical phone on a trusted LAN, use the host's LAN address and an HTTPS static server for `dist/` with a certificate trusted by that phone. HTTP LAN addresses do not enable service workers. Do not expose Vite development tools publicly. On iPhone Safari, open the HTTPS site, wait for the initial load/cache install, then **Share → Add to Home Screen**. iOS does not supply an automatic install prompt. Physical iPhone/Safari and Home Screen behavior are **unverified** in this environment.

## Play

1. Choose names and Score-only or Reveal-used. A new game confirms before replacing a saved game.
2. Tap a starting square, then tap rack letters: the cursor advances automatically. Choose Across/Down to change direction. Tile-first placement also works. First word covers ordinary H8. All new tiles share a row/column and connect to the crossword. Tap a staged tile, then its destination to move it; Remove tile takes it back. Undo reverses the last staging change; Recall takes back the whole pending word. A blank opens an A–Z picker.
3. Submit validates every word. Only the committed turn total is shown. Letter/word bonuses apply to newly placed tiles only; seven tiles add 50. No preview scores are supplied.
4. Read the score receipt, tap **Pass device**, physically hand over, then the next player acknowledges their identity. Their private rack and notes do not mount before acknowledgement. The mover can keep annotating after seeing the score, until Pass device is tapped; that tap immediately locks their notes.
5. Switch to Notes and tap a square. The board-side editor stays open as you select other squares. One tap records a single guess; turn on Multiple possibilities to keep alternatives. Notes mirror under a 180° rotation. Empty hypotheses are allowed. H8 is locked ordinary. Notes are guesses, never certified by the system.
6. History reconstructs each selected turn, highlighting its new tiles and revealing only discoveries available then. Return to live board preserves staging.
7. Six scoreless turns, or emptying a rack with an empty bag, ends the game. Final rack deductions/transfer occur once. The full layout is revealed automatically; compare either player's notes using the selector and square inspection.

Pass/exchange require recalling pending placements. Exchange needs at least seven tiles in the bag and draws replacements before recycling. New game configuration is fixed. Offline play works after the first successful service-worker cache installation; the whole dictionary is bundled. Committed actions and notes auto-save. Reload → Resume always enters a privacy gate. Pending placements and rack display order are deliberately not saved.

## Checks and commits

```sh
npm run typecheck
npm run lint
npm test
npm run test:coverage
npm run test:e2e
npm run build
npm run boards:inspect -- 20
```

ESLint and Vitest were configured before feature implementation. Enable repository hooks after cloning:

```sh
git config core.hooksPath .githooks
```

The pre-commit hook runs **lint, strict type checks, all unit/component tests, and all browser tests**. The browser test command builds the app first. No skipped/focused tests or hook bypasses are used.

Playwright uses installed `/usr/bin/chromium` by default here. Else set `CHROMIUM_PATH` to a Chromium executable, or run `npx playwright install chromium` to use the downloaded browser automatically. The CDN download was denied by this environment's network policy, so tests used system Chromium. Browser tests build with `VITE_DEV_TOOLS=1` to expose reproducible seed/rack fixtures. **Normal `npm run build` omits these controls**. Development builds also expose them. Do not distribute fixture-enabled builds for normal play.

## Architecture and limitations

- `src/engine/`: bag/PRNG, generator, word discovery, scoring, transitions, history and player projection. Engine has no DOM/storage/network imports. `dictionary-meta.ts` holds the pinned ID without loading the list. The controller prefetches `dictionary.ts` after the opening UI paints and awaits its Set before word validation; the split dictionary chunk is also precached offline.
- `src/controller.ts`: keeps authoritative data outside React state, serializes storage and actions, publishes only safe projections.
- `src/components/` and `src/App.tsx`: tap interactions, dialogs, board and privacy gates. No authoritative state is passed as UI props.
- `src/storage/`: versioned IndexedDB snapshots, structural and inventory/history validation, serialized writes. Unsupported schema/rules/dictionary versions produce a warning and an export option, without silently resetting. No migrations are currently supported.
- `src/data/DICTIONARY_LICENSE.md`: exact dictionary provenance/hash and CC0 redistribution terms. Original application code is MIT licensed. Dictionary membership differs from official tournament lists.

UI privacy is **not anti-cheat security**. The full layout, both racks and notes exist in local memory/IndexedDB; device owners can inspect them with developer tools. There are no cryptographic secrecy claims. Storage failures allow continued in-memory play with an explicit unsaved warning. Browser eviction of site storage can remove saves/offline assets. No cross-device sync or multiple-tab coordination is provided.

Engine coverage and test mapping, platform limitations, screenshot evidence and playtest instructions are in [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md). Original supplied engineering brief is treated as a product specification, not authorization for unrelated external actions. This task uses the provided repository; no new remote repository, deployment or PR was created.

## GitHub Pages

Pushes to `main` run `.github/workflows/pages.yml`: format/lint/typecheck/unit/browser checks, production build at `/scrabble-sweeper/`, then deployment through GitHub Pages. Developer fixtures are disabled in the published build. The site URL is `https://willjobs.github.io/scrabble-sweeper/` once the workflow succeeds. Before the first deployment, choose **GitHub Actions** in Settings → Pages → Build and deployment → Source and run the workflow. GitHub requires an owner/admin to enable Pages; the default workflow token cannot do this initial setup. A private repository needs a GitHub plan that supports Pages for private repositories.

For a local production build matching Pages, run `BASE_PATH=/scrabble-sweeper/ npm run build` and `BASE_PATH=/scrabble-sweeper/ npm run preview`, then open `/scrabble-sweeper/`. The manifest, icons, assets, service worker and installation scope follow this base path. Default local builds continue to use `/`.
