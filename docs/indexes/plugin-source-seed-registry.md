# Plugin Source Seed Registry

Date: 2026-04-03
Status: Active. Backlink pass landed. Extension status resolved
Human skim: `docs/indexes/plugin-source-seed-registry.html`

## Purpose

Record how legacy plugin docs relate to the new canonical artifact chain.

## Registry

| Legacy doc | Status | Canonical target |
| --- | --- | --- |
| `docs/chatbridge-presearch.html` | source-seed | `docs/artifacts/presearch/chatbridge-plugin-platform/index.md` |
| `docs/chatbridge-plugin-architecture.html` | source-seed | `docs/artifacts/brainlift/chatbridge-plugin-platform/index.md` |
| `docs/chatbridge-planning-flow.html` | source-seed + projected-visual | `docs/artifacts/plans/chatbridge-plugin-platform/index.md` |
| `docs/plans/2026-04-01-chatbridge-finish-plan.md` | source-seed + historical implementation snapshot | `docs/artifacts/implementation/chatbridge-plugin-platform/index.md` |
| `docs/plans/2026-04-02-k12-edtech-plugins-plan.html` | source-seed overlay | `docs/artifacts/design/chatbridge-plugin-platform/index.md` |
| `docs/plans/2026-04-02-k12-plugin-platform-plan.html` | source-seed overlay | `docs/artifacts/design/chatbridge-plugin-platform/index.md` |

## Current Decision

Legacy plugin docs stay source seeds. The two K12 extension plans also stay source-seed overlays for now. They do not become canonical overlays in the current tree.

Reason:

- they still contain high-value original thinking
- canonical artifacts are new and not battle-tested yet
- migration should preserve discovery before it enforces replacement
- backlink notes now route readers into the canonical chain first
- the current accepted policy favors operator clarity over creating a second canonical branch too early

## Future Decision Gate

The canonical plugin chain already has:

1. presearch
2. brainlift
3. plan
4. implementation contract
5. verification ledger
6. drift report
7. repo-alignment appendix

The remaining gate is not existence alone. Before changing any of these docs from source-seed status, confirm:

1. the chain stays fresh
2. repo-alignment remains credible
3. remote stale-check proof lands

Then decide whether any specific source seed becomes:

- superseded
- promoted into a new canonical branch
