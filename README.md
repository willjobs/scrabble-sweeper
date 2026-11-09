# Veiled Words

A local two-player word game with hidden symmetric bonuses. Implementation in progress.

Node 24.22.1, npm 11.9.0. Run `npm ci`, `npm run dev`. Validation: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`, `npm run build`. Run `npx playwright install chromium` first. Set `PLAYWRIGHT_BROWSERS_PATH=/tmp/hidden-bonus-browsers` on restricted workspaces.

Enable the pre-commit checks with `git config core.hooksPath .githooks`. The hook runs lint, strict type checks, all unit/component tests, and all browser tests before every commit.
