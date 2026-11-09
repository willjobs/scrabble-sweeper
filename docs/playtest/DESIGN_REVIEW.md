# Screenshot design review

A design-review subagent inspected the independent Playwright screenshot set after functional play-testing: production home at 320px, 390px and desktop; populated boards in both modes; long names; blanks; Notes; history; invalid moves; score receipts and receipt-resume gates; recovery and endgame.

## Findings and resolution

| Finding                                                                              | Resolution and recheck                                                                                                                                                |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| At 320px, the blank picker's rightmost letter column was clipped by the dialog edge. | Narrow grid sizing/padding was corrected. The replacement screenshot shows all 26 letters fully inside the dialog, including E/J/O/T/Y.                               |
| At 320px, an unbroken long player name overflowed the Start-turn button.             | The gate CTA now wraps the name within its available width. The replacement screenshot shows the full name and Start turn text without clipping.                      |
| At 320px, the Ordinary hypothesis label was clipped.                                 | Ordinary now spans a full row above a 2×2 premium grid on narrow screens. The replacement screenshot shows all labels and secondary actions legibly within the sheet. |

The corrected screenshots were recaptured with animations disabled to avoid judging transitional background colors as persistent defects. All three replacement captures were visually rechecked. No material visual blockers remain.

Evidence: [blank picker](screenshots/blank-picker-320.png), [narrow Notes](screenshots/long-names-notes-320.png), [long-name handoff](screenshots/long-name-handoff-320.png).

The remaining screens retain a cohesive, playful game identity. Populated desktop gameplay keeps the board, rack and turn actions together. Score receipts, recovery messages and final-result treatment are clear. Long names wrap tightly in small score cards but remain visible; no additional layout changes are necessary for this supported extreme case.

Optional copy polish: the receipt-resume gate's “NEXT UP. NEW POSSIBILITIES.” eyebrow could describe a saved-turn review instead. Its headline and action already explain the correct behavior, so this is not a release blocker.

This is screenshot-based Chromium review, not physical touch-device, Safari or VoiceOver validation. Full-page dialog captures can include pixels beyond the actual backdrop viewport; that capture behavior was not classified as a UI defect.
