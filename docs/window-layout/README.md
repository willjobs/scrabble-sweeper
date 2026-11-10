# One window, one game

The home page and game now use the available window height. Desktop uses an editorial cover and setup column; gameplay gives the board a large left-hand surface and a right-hand control rail. Portrait stacks the scores, board, rack and primary actions. Landscape phones use the side rail too.

The portrait board uses CSS container dimensions to take the space remaining after the controls and the private Notes editor. Its enlarged tiles remain at least 44px across. Coordinate labels no longer impose a hidden minimum height on the fitted board; the grid stays square at small sizes. Letters are centered in their tile faces.

Help, names, history and app status open in native modal sheets with Escape and focus restoration. More contains Pass, Exchange and Home / New game. The ⓘ header button opens app status. Private post-score notes and handoff behavior are unchanged. Long help/history sheets and an enlarged board scroll internally; ordinary home and gameplay do not need document scrolling at the tested sizes. Extremely small windows and enlarged system text may need accessibility scrolling rather than clipped content.

## Iterations and checks

Initial measurements were about 980px for home and 1,020px for gameplay on a 390px-wide phone. The home measurement included development-only fixture controls. The first viewport pass exposed a board/rack overlap on short phones. Moving the board controls into one row and sizing the portrait board from actual remaining height resolved that. Further checks caught an intrinsic coordinate-label minimum height, a narrow Ordinary button and insufficient home spacing; those were corrected before the final captures.

Eight automated viewport flows check fresh/saved home, tap placement and auto-zoom, Notes and post-score annotation, sheet access, page overflow, board/control collisions, 44px rack targets and enlarged tiles. The existing drag suite also covers touch placement without scrolling the page. The endgame test checks both small portrait and landscape windows. Published-site checks now require both home and staged play to fit in Chromium and Firefox.

| Window                       | Layout               |
| ---------------------------- | -------------------- |
| 1440×900, 1280×800, 1024×768 | Desktop side rail    |
| 768×1024                     | Tablet portrait      |
| 390×844, 390×667             | Phone portrait       |
| 320×568                      | Small phone portrait |
| 844×390                      | Phone landscape      |

## Final captures

These are Chromium screenshots at actual CSS viewport sizes, with no image resizing or content clipping. Home captures omit the development-only fixture overlay, which is absent from production. Physical iPhone Safari remains unverified.

- Desktop: [home](desktop-home.png), [play](desktop-game.png), [notes](desktop-notes.png).
- Phone, 390×667: [home](phone-home.png), [play](phone-game.png), [post-score notes](phone-notes.png).
- Small phone, 320×568: [home](small-phone-home.png), [play](small-phone-game.png).
- Landscape phone: [play](landscape-game.png).
