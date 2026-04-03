# Chatbox Living Docs Drift Report

Date: 2026-04-03
Artifact ID: `chatbox-living-docs-drift-report`
Status: Active
Project: `chatbox`

Human skim: `docs/artifacts/drift/chatbox-living-docs/index.html`

## Purpose

Record current drift risks between Chatbox plugin docs, repo behavior, and the new living-docs runtime.

## Drift 1 — Extension plans stay source-seed overlays under current policy

### Evidence

- extension plan docs remain in `docs/plans/`
- backlink notes now route to canonical artifacts and the registry now resolves them as source-seed overlays

### Effect

Split-brain risk is controlled rather than unresolved. Readers can route into canonical docs, and the registry now makes it explicit that these overlays are not canonical branches.

### Repair Packet

- keep source-seed overlay notes explicit in the registry
- only promote an overlay into canonical state after a later explicit decision

## Drift 2 — Freshness check is scheduled, but remote proof is still pending

### Evidence

- `scripts/stale-check.mjs` now exists
- `.github/workflows/stale-check.yml` schedules it weekly
- first remote workflow execution is not yet verified

### Effect

Scheduling is configured, but trust is incomplete until one remote run lands clean.

### Repair Packet

- verify the first remote workflow run
- keep generated stale output observable in docs or CI

## Drift 3 — Visual docs have browser proof, but no recurring visual regression proof

### Evidence

- browser render proof now exists in `docs/artifacts/verification/chatbox-living-docs/browser-proof.png`
- no recurring visual regression capture exists yet

### Effect

Visual artifacts can still drift without recurring render checks.

### Repair Packet

- keep browser proof references current when visual docs change materially
- decide later if visual regression capture belongs in CI

## Drift 4 — Canonical-only proof now exists, but remote schedule proof still gates maturity

### Evidence

- Claude Haiku via MAX router completed the backlink task from canonical artifacts first
- plugin settings now surface the AI intent gate from canonical plugin artifacts
- first remote living-docs refresh workflow execution is still unverified

### Effect

The runtime now guides docs maintenance and one product-facing settings improvement. Remaining maturity gap is operational, not structural.

### Repair Packet

- verify the first remote living-docs refresh workflow run

## Priority Order

1. verified scheduled stale checker execution
2. recurring visual proof policy

## Next Artifact

Post-refresh implementation proof packet.
