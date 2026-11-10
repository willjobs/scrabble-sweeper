# Implementation status

The game is deployed at https://willjobs.com/tile-theory/ from https://github.com/willjobs/tile-theory. Physical iPhone acceptance remains open; automated touch evidence uses Chromium on Linux, not Safari. Published builds are also checked in desktop Chromium and Firefox.

## Feature acceptance

| Group                                                           | Status and evidence                                                                                                                                                                      |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rules, unique tiles, blanks, crosswords, scoring, bingo         | Implemented; deterministic unit fixtures, including blank intersections and old bonus consumption                                                                                        |
| Pass/exchange, scoreless streak, rack-out, negative finals/ties | Implemented; engine fixtures and full six-scoreless-turn browser completion                                                                                                              |
| Symmetric balanced seeded layout                                | Implemented; 1,000 seeds tested; independent layout/bag streams; bounded candidate search; 20 sample boards and descriptive statistics                                                   |
| Score-only and reveal-used                                      | Implemented; whitelisted projections; mode comparison test; no provisional/per-word score fields                                                                                         |
| Private mirrored notes, contradictions, center lock             | Implemented; persistent board-side editor, single/multiple guesses, immediate saves, pair highlighting, two-player separation, endgame comparison/inspection                             |
| Receipt → explicit handoff → acknowledged next player           | Implemented; mover can annotate after scoring; next player’s rack/notes remain absent; handoff locks notes immediately                                                                   |
| Historical reconstruction and discoveries                       | Implemented; read-only selected-turn board, new-tile highlighting, no private rack/notes or future discovery; staging survives history                                                   |
| Responsive portrait interaction and accessibility               | Implemented; 320/390px layout checks, 44px rack height, semantic labels, focus/dialog keyboard support; axe scan covers setup/live/notes                                                 |
| Offline PWA and persistence                                     | Implemented; precached dictionary/assets, manifest/icons, IndexedDB transactions, safe resume gate, failure warnings/export; offline reload then dictionary-validated move tested        |
| Developer fixtures                                              | Seeded layout, opening/blank racks, board export/stats and pure-engine edge-state fixtures. No interactive full-state inspector or arbitrary board editor                                |
| Docs and licensing                                              | MIT original code; CC0 bundled dictionary with verified upstream license, hashes, normalization and limitations; playtest protocol and install/run instructions                          |
| Physical iPhone Safari/Home Screen/lifecycle                    | **Unverified**: installation, notch/home-indicator safe areas, VoiceOver, screen lock and real-device memory/generation latency                                                          |
| Service-worker upgrades / prior-version migrations              | Consent-based update prompt, stale-bundle recovery, exact-scope cache reset and two-tab update tests; saved games retained. Incompatible saves rejected with export/reset; no migrations |
| Exploratory playtesting                                         | Protocol supplied; no human playtest sessions conducted                                                                                                                                  |

## Spec test-ID mapping

Tests group related requirements instead of creating a file per ID. This table describes coverage, not a claim that every suggested test is a separate executed test.

| IDs          | Evidence / gaps                                                                                                                                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G01–G07      | `tests/engine.test.ts`: exact counts, symmetry, center/TW constraints across 1,000 fixed seeds, reproducibility and variability                                                                                            |
| G08          | Layout candidate-count changes do not alter independently created bag stream                                                                                                                                               |
| G09–G10      | Bounded config/failure tests, board export script and sample stats. Linux timing recorded; physical mobile timing unverified                                                                                               |
| T01–T05, T07 | Inventory, refill, deterministic exchange, threshold, draw-before-return and conservation tests                                                                                                                            |
| T06          | Browser shuffle preserves rack contents and staging; display order never changes engine ownership                                                                                                                          |
| V01–V12      | Engine fixtures for opening, gaps, axes, connectivity, invalid main/crosswords, one-tile intersections, old tiles, blank assignment, duplicate IDs/cells, rejection immutability, singleton exclusion                      |
| S01–S13      | Numeric premium/crossword/blank/bingo/old-premium fixtures and safe total-only projection tests                                                                                                                            |
| E01–E09      | Positive/zero score transitions, sixth pass, independent final deductions, single-tile rack-out transfer, game-over rejection and roundtrip idempotence. Tie UI is direct score equality; no dedicated tie browser fixture |
| N01–N05, N07 | Canonical pair bitmasks/private projections, mirror/editor tests, wrong/empty notes, center lock and snapshot roundtrip                                                                                                    |
| N06          | Browser staging survives Notes ↔ Play                                                                                                                                                                                      |
| H01–H07      | Selected-turn board reconstruction/discovery cutoff and explicit absence of private/secret fields; browser history/reveal and invalid action flows                                                                         |
| H08–H10      | Result/handoff/refresh rack absence, resume identity gate, full final layout and historical information rules                                                                                                              |
| P01–P05      | Snapshot/schema/inventory/history validation, deterministic continuation, serialized 31-write note test, IndexedDB roundtrip and reload flows. Unsupported saves warn/export instead of migrating                          |
| P06–P07      | Browser offline reload then successful dictionary validation; storage-blocked warning and continued in-memory game                                                                                                         |
| U01–U07      | Mobile size, tap/recall, blanks/cancel, notes, valid/invalid submissions, two modes same seed/score with different markers                                                                                                 |
| U08–U11      | History staging preservation, exchange/pass/full game-over, refresh/resume gate                                                                                                                                            |
| U12          | Semantic board/rack labels, focus-visible CSS, native dialog focus trap; automated axe scans. Full manual keyboard/VoiceOver audit not performed                                                                           |

## Validation

Toolchain existed before feature work. The repo pre-commit hook runs `npm run check`: ESLint → strict TypeScript → all Vitest tests → all Playwright tests (including a production-style PWA build with fixture tools explicitly enabled). No hook bypasses.

Current unit/component suite: **54 tests** in five files, including the 1,000-seed generator run. Browser suite: **38 flows**, including seven mouse/touch drag and auto-zoom flows, eight viewport/overlap flows and three Pages/update flows. Drag coverage includes mixed tap/drag placement, blanks, moves, rack returns, undo/recall, occupied drops, cancellation, committed tiles, enlarged-board panning and page scrolling. Automatic placement zoom is checked at 320/390px, including overview controls, edge squares and keeping the scale steady during a drag. `npm run test:coverage` measures core engine/storage coverage; do not interpret it as device coverage.

## Screenshots

Chromium, portrait 390px: [New game](screenshots/new-game.png), [gameplay](screenshots/phone-game.png), [Notes editor](screenshots/notes.png), [handoff](screenshots/handoff.png), [full endgame reveal](screenshots/final-board.png). These are functional fixture captures, not iPhone Safari screenshots.

## Remaining limitations

The offline local client is inspectable with developer tools/IndexedDB and is not anti-cheat secure. The Letterpress word list differs from official tournament lists. No cross-device synchronization, old-save migrations, multiple-tab coordination or storage-eviction protection. Physical Safari, Android and non-Chromium desktop behavior are unverified. Soft generator balance is heuristic and needs playtest evidence. The app does not automatically solve or verify hypotheses. No locked game mechanics were intentionally changed.

The follow-up code review and fixes are recorded in [CODE_REVIEW.md](CODE_REVIEW.md). Independent exploratory Playwright testing and screenshot review are recorded under `docs/playtest/`.

The current turn interaction model and screenshots are documented in [turn-flow/README.md](turn-flow/README.md). Earlier screenshot sets show the previous modal Notes workflow.
