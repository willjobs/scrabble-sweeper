# Tile Theory — Sunday Arts

The approved direction combines a newspaper arts page with restrained theatre-programme typography: warm paper (#f7f1e7), charcoal ink, oxblood (#782c2d), ivory tiles and brass rules. Georgia supplies the expressive serif masthead, headline and board caption; system sans-serif keeps letters, point values and controls crisp. No font download is required.

The home page follows the supplied mockup: Tile Theory imprint, a pass-and-play eyebrow, an italic two-line headline, an ivory PLAY/YES board illustration, one primary New game/Resume game action, and concise mode choices. Promotional stickers, saturated purple and the floating app-card treatment are removed. The same palette covers the live board, score cards, private notes, enlarged view, history, receipts, handoff, completion screen and dialogs.

The title, page metadata, PWA name, downloadable save filename, favicon and touch icons now use Tile Theory. The original IndexedDB database name remains deliberately unchanged so existing games survive the rebrand. The repository, URL, save schema and game rules are unchanged. The live-site check expects the new title after successful deployment.

Validation: ESLint, strict TypeScript, 54 unit/component tests and 21 browser checks, including automated accessibility, narrow-phone typography/geometry, zoom, post-score notes, privacy, history, offline resume and Pages subpath/PWA metadata. Screenshot review covers fresh/resumable home pages, play, notes and handoff at 320, 390, 430 and 1280px. Chromium phone emulation does not establish physical iPhone/Safari verification.

Capture gameplay against a fixture-enabled root preview:

```sh
VITE_DEV_TOOLS=1 npm run build
npm run preview -- --port 4181
# In another terminal:
node docs/sunday-arts/capture.mjs
```

Capture the actual production home pages separately (the script asserts developer controls are absent):

```sh
BASE_PATH=/tile-theory/ npm run build
BASE_PATH=/tile-theory/ npm run preview -- --port 4182
# In another terminal:
PREVIEW_URL=http://127.0.0.1:4182/tile-theory/ node docs/sunday-arts/capture.mjs --home
```

Examples: [home](screenshots/home-390.png), [resume](screenshots/resume-390.png), [board](screenshots/board-390.png), [phone notes](screenshots/notes-320.png), [enlarged notes](screenshots/enlarged-notes-390.png), [desktop notes](screenshots/notes-1280.png).
