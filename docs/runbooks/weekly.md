# Weekly Runbook

Date: 2026-04-03
Human skim: `docs/runbooks/index.html#weekly`

## Status

First manual weekly refresh executed. Script-assisted stale check wired. Scheduled runner configured in `.github/workflows/stale-check.yml`.

## Goal

Refresh research and architecture assumptions for active chains.

## Sequence

1. run `pnpm docs:stale-check:write`
2. refresh presearch
3. refresh brainlift if sources changed materially
4. compare legacy plugin corpus docs against canonical migrated chain
5. update source-seed registry if needed
6. reprioritize migration and verification work

## Expected Outputs

- generated `docs/indexes/stale-report.md`
- updated presearch sidecars
- updated brainlift sidecars
- updated verification and drift ledgers when findings move
