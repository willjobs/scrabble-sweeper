# More room for the phone board

The follow-up [Notes layout and palette](../notes-board/README.md) applies the full-width treatment to Notes and introduces four premium colors.

The phone layout now uses a compact identity/score header, a nearly edge-to-edge board, and one labelled action bar below the rack. Direction, Shuffle, Submit, Undo and Recall remain directly available with targets at least 44×44px. The direction arrow shows the current axis; tap it to switch. Visual order matches keyboard order. App status and individual tile removal are available in More; desktop controls retain their existing layout.

Turn and bag information share the header with save status. The game mode remains in More. Eliminating the separate metadata and rack-tool rows recovers space for the board without reducing rack height or removing coordinate labels. Enlarged play and the private, post-score Notes editor remain available.

## Measured grid sizes

Measurements are for the actual 15×15 grid, excluding coordinate gutters. The 393×635 CSS viewport approximates the Safari content area in the supplied comparison; these are browser measurements, not a physical iPhone Safari test.

| Viewport | Previous grid | New grid | Width increase |
| -------- | ------------: | -------: | -------------: |
| 393×635  |       259.5px |    370px |            43% |
| 390×667  |       280.5px |    368px |            31% |
| 320×568  |       192.5px |    298px |            55% |

At 393×635 the grid area is approximately doubled. Both fit and zoomed play keep the main controls visible without document scrolling. Tests enforce near-full-width phone grids, minimum action targets, collision-free layouts and correct focus restoration when switching from More to app status.

## Captures

- [Safari-sized phone](phone-393-635.png), [enlarged play](zoomed.png), [post-score notes](notes.png).
- [390×667 phone](phone-390-667.png), [small phone](phone-320-568.png).

Screenshots use Chromium at the stated CSS viewport sizes. Physical Safari remains unverified. The full regression suite continues to cover mouse/touch dragging, direction changes, shuffle, undo, recall, annotations, history, handoff and offline saves.
