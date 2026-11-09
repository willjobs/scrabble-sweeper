# Implementation decisions

The supplied locked game decisions are retained. The product is called Veiled Words and uses original typography, colors and icons. Source layout is consolidated into useful modules rather than dozens of placeholder files.

The bundled dictionary is the CC0 Letterpress English list, rather than ENABLE, because the actual upstream license is explicit and redistributable. Its exact normalized hash is pinned in the game config. Dictionary lookup uses one Set loaded per app lifetime. The larger initial bundle is deliberate for offline membership checks; no remote API is used.

React subscribes to a controller's whitelisted PlayerView. Authoritative game state remains in module scope. Turn application works on a detached candidate; saving finishes before the new view is published. If storage fails, in-memory play continues with a warning. Notes publish immediately and queue whole snapshots in order. Resume preserves a pending result behind the mover's identity gate; after acknowledgement, the mover reviews the receipt and explicitly passes the device. An active turn resumes behind its own identity gate. A game-over save remains public and final.

History after game over still applies the selected historical turn's information rules, while the live final board reveals all squares. Notes are not historical facts and are omitted from history entirely. Normal play provides neither word score breakdowns nor bonus-validation hints. Annotation contradictions and incorrect singleton hypotheses remain stored.

Developer seeds and opening/blank racks are gated by development mode or explicit VITE_DEV_TOOLS=1. Tests use that flag; normal production builds do not. Pure-engine fixtures cover further edge states. No automatic solver or inference is present.

The prototype has no old-save migrations. Unknown versions and corrupt saves offer export/reset; they never silently reset. Installed iPhone lifecycle, storage eviction, screen lock and service-worker update behavior still require real-device checks. See the status document.
