# Refresh Cadence

Date: 2026-04-03
Status: Active. Runtime heartbeat automation landed. Scheduled runner configured
Human skim: `docs/indexes/refresh-cadence.html`

## Daily

- update `docs/tasks.md`
- run `pnpm docs:stale-check`
- scan active artifacts for stale upstreams
- compare repo deltas to implementation contracts
- refresh verification ledger state
- run `pnpm docs:runtime:refresh`

Current owner split:

- PM agent updates task board
- QA agent updates verification ledger
- Repair agent updates stale report

## Weekly

- run `pnpm docs:refresh`
- refresh presearch for active projects
- refresh brainlift if evidence changed materially
- run drift review on active projects
- update artifact index

Scheduled automation:

- `.github/workflows/stale-check.yml` runs Mondays at 09:00 UTC and now refreshes runtime heartbeat files too
- first remote CI execution still needs verification after push

Current active project:

- `chatbox-living-docs`

Current first migration target:

- plugin corpus

## Monthly

- archive superseded artifacts
- review schema stability
- review skills and agent assignments

## Manual Procedure For Current Repo

### Daily manual sequence

1. inspect `git status`
2. run `pnpm docs:refresh`
3. inspect changed docs under `docs/`
4. update `docs/artifacts/verification/chatbox-living-docs/index.md`
5. update `docs/tasks.md`

### Weekly manual sequence

1. run `pnpm docs:refresh`
2. compare plugin corpus docs to current repo behavior
3. refresh presearch and brainlift sidecars if assumptions moved
4. review hidden gates in settings and tool routing
5. reprioritize migration tasks
