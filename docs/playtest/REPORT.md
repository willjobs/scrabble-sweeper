# Independent Playwright play-test report

The exploratory pass covered the code-review fixes in `0a56708`, followed by a targeted production recheck after dictionary construction was batched. These are Linux system-Chromium observations using Playwright, not physical iPhone/Safari results. The tester did not change application source.

## Method and scope

This pass used separate browser contexts and directly exercised the UI beyond the existing regression suite. Developer starting-rack fixtures made matched games and blanks reproducible; a natural-draw production game was also opened. Saved-state inspection was used to verify inventory, turn counts and recovery, rather than inferring correctness from screenshots alone. Production offline play used a valid saved opening fixture with developer controls absent from the production UI.

Both reveal modes were played through **AT → CAT → CATS → TO → TON** across both players. Each game then used exchange and five passes to reach the six-scoreless-turn ending. This is a legal 11-action completion, not a full tile-bag exhaustion playthrough. The five word totals matched across modes: **2, 5, 6, 4, 3**. Both final scores were **−8 / −17**, and all 100 physical tile IDs remained unique across board, racks and bag.

## Functional results

| Area                                      | Result and evidence                                                                                                                                                                                                              |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Both reveal modes and connected words     | PASS. Same seed/actions gave identical scores; only occupied-square discovery differed. No score changed while staging.                                                                                                          |
| Invalid opening and recall                | PASS. Placement away from H8 rejected without committing or advancing; recalled tiles remained usable.                                                                                                                           |
| Blanks, cancellation and repositioning    | PASS at 320px. Cancel left the cell empty; blank A remained zero-valued after commit. A staged T was repositioned without duplicate use, then recalled and replayed.                                                             |
| Notes and privacy                         | PASS. Staging survived Notes ↔ Play; empty hypotheses stayed stored; TL/TW edits mirrored between A1/O15. The next player did not receive the prior player's notes or rack DOM.                                                  |
| History                                   | PASS. Move 1 omitted later C/N placements and future discoveries; the current staged N returned intact on leaving history. Current rack was absent in history.                                                                   |
| Receipt recovery                          | PASS. Reloading before Pass device preserved the mover's review gate, including a second reload while that gate was saved. Explicit Pass device remained necessary to advance.                                                   |
| Exchange and completion                   | PASS. Exchange advanced a scoreless turn; five subsequent passes ended the game, applied final deductions, and revealed the full layout.                                                                                         |
| Failed-save recovery                      | PASS. A quota-style `put()` failure left the disk snapshot at turn 1 while memory advanced to turn 2. Export contained turn 2/PASS, and Home described in-memory/unsaved progress accurately.                                    |
| Natural draw and replacement cancellation | PASS. Production-style natural draw showed seven tiles. Cancelling saved-game replacement retained the seed.                                                                                                                     |
| Phone/desktop geometry                    | PASS. No horizontal document overflow at 320px, 390px or 1280px. Populated desktop board and Submit were visible together at 1280×900. Long-name states were captured for design review.                                         |
| Offline production                        | PASS. After service-worker readiness and reload, the app resumed behind an identity gate offline and validated/committed AT using the bundled dictionary.                                                                        |
| First dictionary download failure         | PASS. Requests for the dictionary chunk were aborted, producing a readable validation error without advancing turn 1. Restoring the route and resubmitting in the same page recovered to turn 2; browser reload was unnecessary. |

No browser page errors were recorded in the exploratory game flows. Raw case results are retained in [exploration-results.json](exploration-results.json) and [production-results.json](production-results.json).

## Responsiveness measurements

Chromium's CDP 4× CPU slowdown, local production assets, three fresh contexts in one browser process. The measurements do not simulate a real cellular connection or physical mobile CPU. Two-animation-frame latency is an interaction proxy, not a hardware input-to-photon claim.

Before the review fix, the code reviewer measured approximately 1448ms first contentful paint and a 708ms startup long task before content. After splitting dictionary metadata/loading, this independent pass measured:

| Metric                                    | Deferred-only result                                   |
| ----------------------------------------- | ------------------------------------------------------ |
| First contentful paint                    | 500–524ms                                              |
| Largest task beginning before first paint | 159–190ms                                              |
| Largest task overall                      | 505–585ms, occurring after the opening screen appeared |
| Notes toggles to two animation frames     | 18.4–45.6ms, mean 29.8ms                               |

The remaining post-paint task aligned with dictionary evaluation. Root applied a small batched Set construction rather than adding workers, board memoization or state architecture. The targeted after-batching recheck passed all five production scenarios again:

| Metric                                       | Batched construction result                                              |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| First contentful paint                       | 520–576ms                                                                |
| Largest task overall                         | 141–205ms; no post-paint dictionary long task recorded in three contexts |
| Notes toggles to two animation frames        | 16.6–57.1ms, mean 35.3ms                                                 |
| Offline AT submission                        | PASS, committed turn 2                                                   |
| Failed dictionary fetch → same-page resubmit | PASS, committed turn 2 after restoring network                           |

This supports keeping the small batching change. The sample does not justify broader renderer or state-management optimization. The original deferred-only samples remain in [production-before-batching.json](production-before-batching.json); the after-batching samples are in [production-results.json](production-results.json).

## Screenshot index for design review

All screenshots are full-page captures. In a dialog screenshot, pixels below the viewport can appear outside the backdrop because full-page capture extends beyond the actual modal viewport; this alone is not a visual defect.

| State                     | Captures                                                                                                                                                                                                                                                               |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production opening        | [320px](screenshots/home-production-320.png), [390px](screenshots/home-production-390.png), [1280px desktop](screenshots/home-production-desktop.png)                                                                                                                  |
| Populated live board      | [Score-only phone](screenshots/score-only-populated-390.png), [Reveal-used phone](screenshots/reveal-used-populated-390.png), [Score-only desktop](screenshots/score-only-populated-desktop.png), [Reveal-used desktop](screenshots/reveal-used-populated-desktop.png) |
| Invalid opening           | [Score-only](screenshots/score-only-invalid-opening-390.png), [Reveal-used](screenshots/reveal-used-invalid-opening-390.png)                                                                                                                                           |
| Empty Notes hypothesis    | [Score-only](screenshots/score-only-notes-empty-390.png), [Reveal-used](screenshots/reveal-used-notes-empty-390.png)                                                                                                                                                   |
| Historical board          | [Score-only](screenshots/score-only-history-390.png), [Reveal-used](screenshots/reveal-used-history-390.png)                                                                                                                                                           |
| Turn receipt              | [Score-only](screenshots/score-only-receipt-390.png), [Reveal-used](screenshots/reveal-used-receipt-390.png)                                                                                                                                                           |
| Receipt identity gate     | [Score-only](screenshots/score-only-receipt-resume-390.png), [Reveal-used](screenshots/reveal-used-receipt-resume-390.png)                                                                                                                                             |
| Full final reveal         | [Score-only](screenshots/score-only-endgame-390.png), [Reveal-used](screenshots/reveal-used-endgame-390.png)                                                                                                                                                           |
| Long names / narrow phone | [Live game](screenshots/long-names-game-320.png), [Notes](screenshots/long-names-notes-320.png), [handoff](screenshots/long-name-handoff-320.png), [blank picker](screenshots/blank-picker-320.png)                                                                    |
| Recovery                  | [Unsaved export/Home](screenshots/unsaved-recovery-390.png), [resume Home](screenshots/resume-home-390.png), [offline committed result](screenshots/offline-result-390.png), [dictionary network error](screenshots/dictionary-network-error-390.png)                  |

## Reproduction and limits

The scripts are manual exploratory artifacts, not substitutes for `npm run check`:

1. Start `npm run dev -- --port 4183` for isolated developer fixtures.
2. Build normal production with `npm run build`, then start `npm run preview -- --port 4184` in another terminal.
3. Run `node docs/playtest/explore.mjs` and `node docs/playtest/production.mjs` from the repository root.

The exploration script uses port 4183 by default (`PLAYTEST_URL` can override it). The production script obtains a valid starting fixture from that dev server, then tests port 4184. It should be run while no other task is rebuilding the shared `dist/`. Both scripts return nonzero if a recorded case fails. Script globals are declared explicitly and scripts are formatted/linted.

Remaining limits: no physical Safari/Android/VoiceOver audit, no real touch hardware or cellular latency, no exhaustive dictionary membership audit, no bag-exhaustion game played through the UI, and no multiple-tab coordination claim. The requested screenshot review by a design subagent is the next phase; visual recommendations should be judged separately from these functional pass results.

## Targeted narrow-phone design fixes

The subsequent design review identified three concrete 320px clipping issues: alphabet-grid content width, the long-name handoff CTA, and the Ordinary hypothesis label. Root adjusted only the relevant layout CSS and added a browser regression. An independent targeted UI recheck then replayed blank assignment, Notes and handoff at 320×740; no application source was changed by this tester.

All alphabet buttons remained within the viewport and their labels fit. Measured alphabet container `clientWidth/scrollWidth` was **234/234px**, Ordinary control **230/230px**, and the long-name handoff button **248/248px**, with a **90px** height accommodating wrapped text. The first recheck recorded no browser page errors. The three corrected captures were taken with screenshot animations disabled and replace their main screenshot paths above. Original captures remain under `screenshots/before-layout-fixes/` for comparison. No functional flows or performance samples were rerun beyond these targeted CSS checks.
