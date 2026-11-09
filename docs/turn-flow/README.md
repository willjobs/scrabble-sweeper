# Play, learn, annotate, hand off

User play feedback exposed the wrong lifecycle: private notes ended at submission, just when the score and reveal-used information arrived. The mover now owns annotation access throughout TURN and RESULT. Only explicit Pass device ends that access. Result racks remain hidden; opponent notes never enter the projection. The handoff view replaces the private board/editor immediately, before waiting for storage.

The annotation editor is a nonmodal board-side workspace. Switching squares updates it in place. A single tap records one candidate; Multiple possibilities enables sets. Unknown and deliberately empty sets still have separate reset/clear actions. Revealed occupied-square information appears as an observation, separate from the player's unverified guess. Symmetric notes mirror as before, without revealing an empty counterpart's truth. Staged words survive switching between Play/Notes and history.

Placement accepts board-first or tile-first input. After placing a tile, the cursor advances across/down, skipping committed and already-staged tiles without crossing a row boundary. Tapping a staged tile selects it for moving; Remove tile, Undo and Recall handle corrections. Blanks keep their assignments when moved. No provisional scoring is introduced.

The compact receipt keeps Pass device available above the board while the mover annotates. Phone notes controls sit below the board, not over it; desktop uses a side-by-side workspace. Screenshots cover 320×740, 390×844 and 1280×900. These are Chromium fixture captures, not physical iPhone verification.

Validation includes post-score note edits in both reveal modes, persistence/reload of those edits, opponent isolation, a deferred-save handoff privacy test, single-guess/multiple-candidate controls, across/down auto-placement, Undo and Recall. Existing scoring, privacy, blank, exchange, history, offline and completion suites remain in the commit gate.
