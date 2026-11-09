# Playtest sheet

Plan 10–20 games across several pairs. Use matched seeds where practical, similar experience levels, and alternate which mode goes first. This is exploratory feedback, not evidence of scientific causality. No telemetry is collected.

Preparation: run `npm run dev` locally or deliberately build with `VITE_DEV_TOOLS=1` for supervised testing. Enter the same seed in Developer fixtures for both modes and leave Starting rack at Natural draw. Same seed and action sequence produce the same layout/draws; different actions can change subsequent draws. Never show debug seeds to players who should remain blind.

Explain: tap tile then square, opening crosses H8, submit reveals total only, notes mirror to the opposite square, guesses are not checked, pass through the identity gate, history is read-only, six scoreless turns or rack-out ends the game.

Record manually:

| Field                                              | Record |
| -------------------------------------------------- | ------ |
| Date / pair / seed / mode / mode order             |        |
| Prior word-game experience                         |        |
| Duration / completed / end reason / final scores   |        |
| Number and types of note edits; empty hypotheses   |        |
| Symmetry or history consultations                  |        |
| A specific inference and whether it changed a move |        |
| Confusion about consumed bonuses, notes or handoff |        |
| Any touch, save, offline or dictionary problems    |        |

Ask after each game: Were scores informative or underdetermined? Did known bonuses improve planning or diminish deduction? Did lucky bonuses feel unfair? Was note editing too cumbersome? Did you ever sacrifice immediate points to approach a suspected bonus? Which mode would you play again, and why?

Real-device checklist: Safari at 320–430 CSS px, portrait, VoiceOver/focus, safe areas, install via Share, offline relaunch, leave/switch tab, screen lock/unlock, close/reopen, note restore, pending-tile loss explanation, resume gate, service-worker update with an existing save. These checks remain unverified until actually run on a physical iPhone.
