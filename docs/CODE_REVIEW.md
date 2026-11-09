# Correctness and responsiveness review

A dedicated code-review subagent inspected engine, controller, persistence, UI, PWA/deployment and tests. The review prioritized reproducible correctness defects, followed by measured latency; no speculative architecture or defensive-save changes were requested.

## Confirmed findings and fixes

1. **P2 — resuming a saved result skipped its receipt.** `resumeGate` advanced directly to the next player. A crash after saving but before rendering could therefore omit the mover's score receipt. A persisted, optional `resumeResult` flag now holds the mover behind an identity gate and restores RESULT on acknowledgement. Only Pass device advances players. Existing saves remain readable. Regression coverage includes repeated reload of that gate.
2. **P2 — recovery export returned stale disk state.** After a write failure, play continued in memory but Export read the older IndexedDB snapshot. Export now uses the authoritative in-memory snapshot when available and retains raw stored export for corrupt-save recovery. The Home dialog describes unsaved in-memory progress accurately. A browser regression forces a quota-style write failure, passes a turn and checks the downloaded turn index/action.
3. **P2 — dictionary construction blocked the opening UI.** The reviewer measured a 708ms startup main-thread long task and ~1.45s FCP with Chromium at 4× CPU slowdown and local production assets. The 274,926-word Set was loaded via imports that only needed its ID. Metadata is now separate; the controller prefetches the dictionary after the opening UI has painted and awaits it before PLAY validation. Construction yields every 4,096 words instead of blocking early input in one large Set operation. PASS/EXCHANGE need no dictionary. Vite/Workbox still precache the dictionary chunk for offline play. Failed prefetch can retry on submission.

The reviewer found no further material scoring, placement, crossword, blank, exchange, final-rack adjustment, history-disclosure, projection, dialog-lifecycle or handoff-busy defects. Note interactions measured ~25–52ms to two animation frames under CPU throttling; no board memoization/state-framework changes were justified. These measurements are Linux Chromium evidence, not physical iPhone results.

The separate deployment concern remains: repository Pages settings currently also trigger the legacy Jekyll publisher. The source should be GitHub Actions to avoid competing source/build deployments; available app/workflow tokens cannot change that administration setting. No application workaround or token-permission expansion was added.

## Follow-up play-testing plan and results

After these fixes pass the normal checks, a separate Playwright play-testing subagent will:

- Play both information modes through setup, placements, receipt, handoff and completion.
- Exercise invalid words/geometry, blanks/cancel, recall/repositioning, exchange/pass, notes/contradictions/mirroring and history.
- Check receipt resume, saved/unsaved recovery, offline reload and runtime responsiveness.
- Capture key states at 320px, 390px and desktop widths, including long names, populated boards and dialogs.
- Supply screenshots to a separate design-review subagent for alignment, wrapping, clarity and interaction issues.
- Recheck concrete fixes found during that independent play-test; avoid adding features or speculative optimizations.

Independent functional testing completed successfully; its full results, throttled timings and screenshot index are in [playtest/REPORT.md](playtest/REPORT.md). After batching, FCP was 520–576ms and the largest task 141–205ms under 4× CPU throttling, with no post-paint dictionary long task recorded in three contexts. The final screenshot review found three narrow-screen clipping issues (blank-letter column, long handoff label, Ordinary chip); these received small layout fixes and a browser regression.
