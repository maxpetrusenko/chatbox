# Chatbox Living Docs Implementation Contract

Date: 2026-04-03
Artifact ID: `chatbox-living-docs-implementation-contract`
Status: Proposed
Project: `chatbox`

Human skim: `docs/artifacts/implementation/chatbox-living-docs/index.html`

## Purpose

Convert the living-docs rollout plan into bounded implementation waves for this repo.

## Wave 1

### Goal

Make the docs runtime real enough to manage this repo’s plugin corpus and prove the refresh loop in practice.

### Files In Scope

- `docs/tasks.md`
- `docs/indexes/artifacts-index.md`
- `docs/indexes/stale-report.md`
- `docs/indexes/refresh-cadence.md`
- `docs/artifacts/presearch/chatbox-living-docs/*`
- `docs/artifacts/brainlift/chatbox-living-docs/*`
- `docs/artifacts/plans/chatbox-living-docs/*`
- `docs/artifacts/implementation/chatbox-living-docs/*`
- `docs/artifacts/verification/chatbox-living-docs/*`
- `docs/artifacts/drift/chatbox-living-docs/*`
- `docs/artifacts/plans/chatbox-plugin-corpus-migration/*`
- `docs/skills/*`

### Deliverables

1. project-specific artifact chain exists
2. sidecars exist for active artifacts
3. stale report names real repo drift
4. migration plan exists for plugin corpus
5. verification ledger exists for current state

### Acceptance Criteria

- at least one full chain exists: presearch -> brainlift -> plan -> implementation -> verification -> drift
- every active artifact has a sidecar
- `docs/tasks.md` reflects active artifact state
- migration plan names concrete existing plugin docs to convert
- weekly refresh executes once and is recorded
- stale checker and backlink wave land in repo

## Wave 2

### Goal

Turn docs runtime conventions into reusable skill-ready templates.

### Files In Scope

- `docs/skills/presearch.md`
- `docs/skills/brainlift.md`
- `docs/skills/visual-plan.md`
- `docs/skills/implementation-contract.md`
- `docs/skills/drift-review.md`
- new templates under `docs/artifacts/*`

### Deliverables

1. template artifact folder shape
2. decision record template
3. verification ledger template
4. stale propagation rules documented per artifact class

## Wave 3

### Goal

Migrate existing plugin docs into canonical managed artifacts.

### Existing source docs to migrate

- `docs/chatbridge-presearch.html`
- `docs/chatbridge-plugin-architecture.html`
- `docs/chatbridge-planning-flow.html`
- `docs/plans/2026-04-01-chatbridge-finish-plan.md`
- `docs/plans/2026-04-02-k12-edtech-plugins-plan.html`
- `docs/plans/2026-04-02-k12-plugin-platform-plan.html`

### Acceptance Criteria

- each migrated doc has artifact owner and sidecar
- each migrated doc has freshness state
- each migrated doc has explicit upstream/downstream links

## Hidden Preconditions To Always Record

Because this repo has hidden behavior gates, every implementation packet must call out:

- desktop-only runtime checks
- role and permission checks
- auth checks
- heuristic tool-use gating

Repo anchors:

- `src/renderer/routes/settings/plugins-drop.tsx:91`
- `src/renderer/routes/settings/plugins.tsx:124`
- `src/renderer/packages/model-calls/stream-text.ts:216`
- `src/renderer/stores/pluginRegistry.ts:190`

## Out of Scope For Now

- browser dashboard for artifact graph
- repo-wide migration beyond plugin corpus

## Next Artifact

Verification ledger for what is already true and what still lacks proof.
