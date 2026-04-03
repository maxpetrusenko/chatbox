# ChatBridge Plugin Platform Drift Report

Date: 2026-04-03
Artifact ID: `chatbridge-plugin-platform-drift-report`
Status: Active
Project: `chatbox`

Human skim: `docs/artifacts/drift/chatbridge-plugin-platform/index.html`

## Drift 1 — Extension plans still sit outside the canonical chain

### Evidence

- extension plans still live under `docs/plans/`
- they now backlink to canonical artifacts, but they do not have sidecars or managed status

### Risk

Backlinks improve routing, but extensions still bypass the managed graph.

### Repair

- keep them explicit as source-seed overlays unless a later product decision creates a new canonical branch

## Drift 2 — Original build checklist lacks explicit current repo gates

### Evidence

- original build checklist ends at OAuth Broker in `docs/chatbridge-planning-flow.html:525`
- current repo behavior also depends on runtime, permissions, auth, and heuristics

### Repair

- keep the original checklist as seed truth
- elevate `Policy + Surface Reality` as Lane 6 in canonical plan

## Drift 3 — Repo-alignment appendix exists, but must stay fresh

### Evidence

- resolved by `docs/artifacts/brainlift/chatbridge-plugin-platform/repo-alignment-appendix.md`

### Repair

- refresh the appendix during weekly review when plugin gates change materially

## Drift 4 — Browser proof exists, but freshness is still unverified remotely

### Evidence

- `scripts/stale-check.mjs` exists
- `.github/workflows/stale-check.yml` is configured
- browser render proof exists at `docs/artifacts/verification/chatbridge-plugin-platform/browser-proof.png`
- first remote stale-check run is still unverified

### Repair

- verify the first scheduled stale-check run
- keep browser-proof references current when plugin visuals change materially

## Drift 5 — Source-seed policy is resolved, but must stay visible

### Evidence

- registry now records the extension plans as source-seed overlays
- decisions hub now reflects the same policy

### Repair

- keep registry, decisions, verification, and drift pages aligned to the current source-seed overlay policy

## Priority Order

1. verified scheduled stale checker execution
2. keep extension source-seed policy aligned across the active tree
3. recurring visual proof policy
