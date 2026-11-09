# Game UI redesign

The design brief was to make the whole experience feel like an inviting word game, rather than a course/job signup page. A dedicated UI-design subagent reviewed the original, the first redesign, the populated mobile game and desktop, and the final refinements. Original artwork and CSS are used throughout; no NYT Games or Words With Friends assets or branding are copied.

## Review iterations

1. The original had an editorial serif headline, muted olive palette, large form card, and player fields before the start action. The designer recommended a playful game-box composition, a tactile mini crossword, a dominant start button, and collapsed optional names.
2. The first pass introduced cobalt/lavender/yellow, chunky sans typography, dimensional tiles, compact mode cards, numbered player cards, bright results and a handoff player token. Review identified an incorrect active-player emphasis after game over, unbalanced Notes controls, excessive purple layering, and the need to inspect real populated game states.
3. The second pass highlights the actual winner in gold, separates white play controls from the board, uses a consistent CSS play icon, balances Notes controls, and distinguishes bright dashed staged tiles from committed ivory tiles. Populated boards, score receipts and handoffs were inspected. A desktop issue remained: the rack was below the fold.
4. The final pass caps desktop board height against the viewport and compacts the desktop rack/header. At 1280×900, the board, rack and Submit/Recall/Pass/Exchange coexist without scrolling between tile selection and placement. The designer reviewed the final desktop and mobile captures and reported no remaining material visual blockers.

## Evidence

- [Production home, phone](screenshots/redesign/home-mobile.png)
- [Production home, 320px](screenshots/redesign/home-small.png)
- [Production home, desktop](screenshots/redesign/home-desktop.png)
- [Staged word, phone](screenshots/redesign/staged-mobile.png)
- [Committed word, phone](screenshots/redesign/committed-mobile.png)
- [Populated desktop at 1280×900](screenshots/redesign/game-desktop.png)
- [Notes editor](screenshots/redesign/notes-mobile.png)
- [Turn receipt](screenshots/redesign/result-mobile.png)
- [Device handoff](screenshots/redesign/handoff-mobile.png)

Game-state screenshots use isolated developer rack fixtures; production home captures come from a normal build with developer tools disabled. Original screenshots remain in the parent directory for comparison. Physical iPhone/Safari appearance remains unverified.

The design does not change scoring, generation, dictionary, turn rules or information boundaries. Decorative home art is a fixed illustration. Unknown gameplay squares remain neutral; colors never encode undiscovered bonuses. Staged tiles expose no score preview. All existing engine, privacy, offline, accessibility and browser flows run before committing, with an added desktop viewport assertion.
