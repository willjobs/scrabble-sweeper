# Tile Theory

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

1. Choose Score-only or Reveal-used. Who’s playing? opens optional player names. A new game confirms before replacing a saved game.
2. Drag rack letters onto empty squares with a finger or mouse, or tap a starting square then tap rack letters: the cursor advances automatically. Placing a tile automatically enlarges the board around that square, after the drop or tap finishes. Fit board restores the overview; the next placement zooms in again. Choose Across/Down to change direction. Tile-first placement also works. First word covers ordinary H8. All new tiles share a row/column and connect to the crossword. Drag a staged tile to another square or back to the rack; tapping a staged tile then its destination also works. Drag near an enlarged board's edges to pan, or near the screen's top/bottom to scroll. Occupied/outside drops leave tiles in place; Escape cancels a drag. Undo reverses the last staging change; Recall takes back the whole pending word. A blank opens an A–Z picker.
3. Submit validates every word. Only the committed turn total is shown. Letter/word bonuses apply to newly placed tiles only; seven tiles add 50. No preview scores are supplied.
4. Read the score receipt, tap **Pass device**, physically hand over, then the next player acknowledges their identity. Their private rack and notes do not mount before acknowledgement. The mover can keep annotating after seeing the score, until Pass device is tapped; that tap immediately locks their notes.
5. Switch to Notes and tap a square. The board-side editor stays open as you select other squares. One tap records a single guess; turn on Multi (Multiple possibilities on desktop) to keep alternatives. Notes mirror under a 180° rotation. Empty hypotheses are allowed. H8 is locked ordinary. The Notes map shows guess codes with dashed outlines and observed bonuses with solid outlines. Enlarge makes squares easier to read and tap; swipe inside the board, then use Fit board for the overview. Notes are guesses, never certified by the system.
6. History reconstructs each selected turn, highlighting its new tiles and revealing only discoveries available then. Return to live board preserves staging.
7. Six scoreless turns, or emptying a rack with an empty bag, ends the game. Final rack deductions/transfer occur once. The full layout is revealed automatically; compare either player's notes using the selector and square inspection.

Open More for Pass, Exchange and Home / New game. Pass/exchange require recalling pending placements. Exchange needs at least seven tiles in the bag and draws replacements before recycling. New game configuration is fixed. Offline play works after the first successful service-worker cache installation; the whole dictionary is bundled. Committed actions and notes auto-save. Reload → Resume always enters a privacy gate. Pending placements and rack display order are deliberately not saved.

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
- `src/components/`, `src/App.tsx` and `src/useTileDrag.tsx`: tap/pointer interactions, dialogs, board and privacy gates. No authoritative state is passed as UI props.
- `src/storage/`: versioned IndexedDB snapshots, structural and inventory/history validation, serialized writes. Unsupported schema/rules/dictionary versions produce a warning and an export option, without silently resetting. No migrations are currently supported.
- `src/data/DICTIONARY_LICENSE.md`: exact dictionary provenance/hash and CC0 redistribution terms. Original application code is MIT licensed. Dictionary membership differs from official tournament lists.

UI privacy is **not anti-cheat security**. The full layout, both racks and notes exist in local memory/IndexedDB; device owners can inspect them with developer tools. There are no cryptographic secrecy claims. Storage failures allow continued in-memory play with an explicit unsaved warning. Browser eviction of site storage can remove saves/offline assets. No cross-device sync or multiple-tab coordination is provided.

Engine coverage and test mapping, platform limitations, screenshot evidence and playtest instructions are in [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md). Original supplied engineering brief is treated as a product specification, not authorization for unrelated external actions. This task uses the provided repository; no new remote repository, deployment or PR was created.

## GitHub Pages

Pushes to `main` run `.github/workflows/pages.yml`: format/lint/typecheck/unit/browser checks, production build using the base path reported by GitHub Pages (currently `/tile-theory/`), then deployment through GitHub Pages. Developer fixtures are disabled in the published build. The site URL is `https://willjobs.com/tile-theory/` once the workflow succeeds. Before the first deployment, choose **GitHub Actions** in Settings → Pages → Build and deployment → Source and run the workflow. GitHub requires an owner/admin to enable Pages; the default workflow token cannot do this initial setup. A private repository needs a GitHub plan that supports Pages for private repositories.

For a local production build matching Pages, run `BASE_PATH=/tile-theory/ npm run build` and `BASE_PATH=/tile-theory/ npm run preview`, then open `/tile-theory/`. The manifest, icons, assets, service worker and installation scope follow this base path. Default local builds continue to use `/`.

## App updates and stale files

On phones, **More → App status & updates** opens the update controls. On the home screen and desktop, use the header’s ⓘ button. These controls include the build ID, a manual update check and a safe refresh. A waiting service worker announces a new version; the player chooses when to reload. Updating in another tab does not reload a tab with a pending move. Refresh buttons wait for the committed game to be saved; unsubmitted tiles are recalled. Recovery clears only this game's Workbox caches and service worker registration, never IndexedDB or other apps' caches. It first checks that the latest HTML and application bundle are reachable, so an offline refresh does not erase the offline app.

If the entry bundle cannot load, a small recovery screen in the HTML provides **Refresh app**, independent of React and its JavaScript bundle. This replaces an unexplained blank page with an explicit retry path. Every build includes its ID in HTML, JavaScript and `version.json`; live Chromium/Firefox checks require the exact deployed commit, rather than accepting any older working build.

GitHub Pages controls its own HTTP cache headers (currently a ten-minute lifetime). Repository files cannot override those headers. Cloudflare currently passes HTML through (`DYNAMIC`); keep HTML, `sw.js` and `version.json` out of any future Cache Everything rules. Content-hashed files under `assets/` may be cached long-term. Saved games stay in the same origin's IndexedDB across updates.

## A game that fits the window

Home uses an editorial two-column layout on desktop and a compact illustrated cover on phones. Gameplay keeps the board, scores, rack and primary actions together: a side rail on desktop/landscape phones, and a height-aware stack in portrait. The portrait board measures its remaining space after the controls and Notes editor, preserving square cells and 44px rack/bonus buttons. Enlarge still pans inside the board; it does not require scrolling the page. Letter faces are centered at both scales.

Help, player names, history and app status open in keyboard-accessible sheets. More contains infrequent turn actions; post-score notes remain available until Pass device. The responsive checks cover eight windows from 320×568 to 1440×900, including 844×390 landscape, with page overflow and collision assertions. Screenshots and iteration notes are in [docs/window-layout/README.md](docs/window-layout/README.md).

The phone board now uses nearly the full screen width, with direction, shuffle, submit, undo and recall in one labelled action bar. Tap the direction arrow to switch Across/Down. See [phone board measurements and screenshots](docs/mobile-board/README.md).

Notes now has a compact two-row phone editor with the same large board before and after scoring. Options contains the full readout, Reset and Clear. DL/TL/DW/TW have distinct blue/teal/ochre/oxblood inks, shared by guesses, observations and controls. Dashed and solid borders still distinguish guesses from facts. See [Notes layout and palette](docs/notes-board/README.md).
