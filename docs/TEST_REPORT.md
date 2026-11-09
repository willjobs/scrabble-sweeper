# Validation report

Validated November 8, 2026 (America/New_York; November 9 UTC) in this managed Linux workspace. Node 24.22.1, npm 11.9.0, system Chromium through Playwright. Physical iPhone/Safari unavailable and unverified.

| Command/check                          | Result                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci --cache /tmp/hidden-bonus-npm` | Clean lockfile installation passed (514 packages)                                                                                   |
| `npm run format:check`                 | All matched files pass Prettier                                                                                                     |
| `npm run lint`                         | ESLint passed, zero warnings                                                                                                        |
| `npm run typecheck`                    | Strict TypeScript passed                                                                                                            |
| `npm test`                             | 48 passed, 4 files, no skipped tests                                                                                                |
| `npm run test:coverage`                | 48 passed; core engine branches 97.15%, statements 99.32%, functions 100%; engine + storage branches 93.17%                         |
| `npm run test:e2e`                     | 12 Chromium flows passed, no skipped tests                                                                                          |
| `npm run build`                        | Normal production PWA build passed; 10 precache entries (~3.1 MB), including bundled dictionary                                     |
| Production Chromium smoke              | New game opens, 225 board cells and 7 rack tiles; Developer fixtures absent; no browser page errors                                 |
| `npm run boards:inspect -- 20`         | 20 layouts exported in boards-sample.txt, 32 ms Linux sample; mean quality penalty 85.00; regional/word-premium statistics recorded |
| Generator property run                 | 1,000 fixed seeds pass every hard constraint, 1,000 distinct layouts                                                                |

Browser coverage: score receipt/handoff/privacy DOM boundaries; valid/invalid placement; recall; blank choice/cancel; notes mirroring, contradictions and per-player privacy; historical reconstruction/staging preservation; same-seed scores across modes with different reveal markers; exchange; six-scoreless-turn game completion and full reveal; IndexedDB resume identity gate; offline refresh then dictionary-validated play; storage failures; responsive widths 320/390; rack shuffle ownership; axe accessibility scans on setup, game and notes dialog.

Storage unit coverage: version/schema errors, 100-tile inventory/history invariants, exact snapshot roundtrip, deterministic continuation, and 31 queued note snapshots finishing with the newest saved state. Engine tests cover the brief's numeric scoring examples, crosswords, old premiums, blank intersections, bingo, short-rack out and final deductions.

Initial browser runs caught and fixed a result-transition crash caused by stale staging references after the rack became private, helper-text contrast, and visual/accessibility label mismatches. Final checks pass without disabling those rules or bypassing hooks.

The Playwright browser CDN was denied by environment network policy; the installed Chromium executable was used successfully. This is a browser download limitation, not a skipped browser suite. Tests deliberately enable developer fixtures at build time. The separate normal build smoke verifies those controls are absent by default. Vite warns about the large dictionary-containing chunk; the bundled offline dictionary makes this expected, and the service worker's cache size limit is configured to include it.

Git commits are gated by `.githooks/pre-commit`, which runs lint, typecheck, all unit/component tests and all browser tests. A GitHub Actions workflow supplies the same checks, formatting, coverage and normal build when pushed; remote CI has not been run in this task.

Not verified: physical Safari/Home Screen installation, VoiceOver/manual keyboard audit, real-device screen lock/tab lifecycle and memory/latency, browser cache eviction, live service-worker upgrade across versions, Android or other desktop engines. No migrations from previous save versions and no multiple-tab coordination. No human playtest data or hosting deployment is claimed.
