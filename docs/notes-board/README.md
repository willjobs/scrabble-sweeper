# A full-width Notes board

Phone Notes now uses a steady two-row editor: selected square/readout and Options above five premium choices plus Multi. Selecting a square, recording a guess, changing to a blank square or selecting the locked center does not resize the editor. Its height is approximately 101px, down from 203px. Bonus targets and the Multi toggle remain at least 44px; Options holds the full readout, Reset, Clear and the color legend. Desktop retains the larger side editor.

The phone score receipt is also compact, preserving the same board size after submitting. Pass device stays a 44px target; both players' totals are available in More. Notes remain private and editable until handoff.

| Phone viewport | Previous Notes grid | New Notes grid |
| -------------- | ------------------: | -------------: |
| 393×635        |             270.5px |          371px |
| 390×667        |             302.5px |          368px |
| 320×568        |             203.5px |          298px |

At the Safari-sized 393×635 content window, this is about 37% more width and 88% more grid area, with no document scrolling. Both turn-time and post-score Notes use the same geometry. These are CSS viewport measurements in Chromium; physical iPhone Safari remains unverified.

## Premium colors

| Bonus              | Ink       | Color   |
| ------------------ | --------- | ------- |
| DL · double letter | `#355f88` | Blue    |
| TL · triple letter | `#21685d` | Teal    |
| DW · double word   | `#805214` | Ochre   |
| TW · triple word   | `#87353e` | Oxblood |

The same inks identify map codes, choice buttons, observed readouts, and the chips for multiple possibilities. Guesses use pale fills and dashed borders; observations use stronger fills and solid borders. A wrong guess keeps its guessed color, rather than inheriting the true bonus. Unknown squares get no premium attribute or color. Labels remain visible, so color is supplementary.

## Review and validation

- [Phone Notes](notes-393-635.png), [small phone](notes-320-568.png), [desktop Notes](notes-1280-800.png), [Options and legend](options.png).
- Existing viewport checks now enforce the compact editor, stable selection geometry, full-width Notes before/after scoring and distinct premium colors. Reset, Clear, Multi, the locked center, mirrored notes and keyboard focus restoration are covered.
- Observed colors are exercised through the genuine endgame reveal. Component checks ensure guesses do not expose hidden or underlying bonus types. Live-site checks exercise mirrored notes, editor dimensions and the palette in Chromium and Firefox.

The colored dashed squares in these captures are deliberately entered private hypotheses, not certified bonuses. Captures use native CSS sizes and disable transient animations; they are not resized or composited.
