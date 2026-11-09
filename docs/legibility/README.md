# Phone legibility

The phone comparison exposed competing labels inside a roughly 20px square. The board now gives letters and bonus deductions separate views instead of shrinking letters, points, observed premiums and private markers into the same tile.

- Play/Board prioritizes bold letters and larger upper-right point values. Rack values use the same corner, with 12px type. A thinner board frame and wider phone board reclaim space; the gameplay masthead is compact.
- Notes is a bonus/guess map. Single guesses display their actual code, not a generic question mark. Dashed outlines distinguish unverified guesses from solid observed bonuses. Ordinary is “—”; an explicitly empty set is “∅”. Contradictory guesses remain allowed and separate from the observation in the details panel.
- Multiple guesses show their count in the full-board view, every candidate in the enlarged view, and their full names in the selected-square summary. Unknown squares remain empty.
- Enlarge provides at least 44px squares at 320px and 390px. Native scrolling stays inside the board, coordinate labels stay visible, and the placement cursor pans into view. Fit board restores the overview. Zoom does not render a second copy of private board data.
- The selected-square panel shows a large tile, its points, the public observation and the player's hypotheses. Notes buttons, summaries and secondary actions have larger text, with no truncated Ordinary button at 320px.

Automated checks cover typography thresholds, enlarged hit areas, cursor navigation, multiple candidates, mirrored notes, privacy and document width at 320px and 390px. Existing offline, scoring, blank, history, storage and accessibility checks still run. Captures cover 320px, 390px, 430px and desktop; reviewed for alignment, clipping, contrast, corner placement and label wrapping. These are Chromium captures with phone viewport/touch emulation, not physical iPhone/Safari verification.

Run `node docs/legibility/capture.mjs` against a fixture-enabled preview (defaults to port 4181). Screenshots include:

- [390px letters](screenshots/letters-390.png) and [enlarged letters](screenshots/enlarged-letters-390.png)
- [390px notes](screenshots/notes-390.png) and [enlarged notes](screenshots/enlarged-notes-390.png)
- [320px notes](screenshots/notes-320.png) and [enlarged notes](screenshots/enlarged-notes-320.png)
- [Desktop workspace](screenshots/notes-1280.png)
