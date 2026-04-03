# Chatbox Plugin Corpus Migration Plan

Date: 2026-03-31
Artifact ID: `chatbox-plugin-corpus-migration-plan`
Status: Proposed
Project: `chatbox`
Human skim: `docs/artifacts/plans/chatbox-plugin-corpus-migration/index.html`

## Goal

Convert the existing plugin documentation corpus into the new canonical living-docs artifact graph.

## Source Corpus

### Primary sources

- `docs/chatbridge-presearch.html`
- `docs/chatbridge-plugin-architecture.html`
- `docs/chatbridge-planning-flow.html`

### Secondary sources

- `docs/plans/2026-04-01-chatbridge-finish-plan.md`
- `docs/plans/2026-04-02-k12-edtech-plugins-plan.html`
- `docs/plans/2026-04-02-k12-plugin-platform-plan.html`
- `docs/plugin-api.md`

## Migration Mapping

| Existing doc | New canonical artifact | Why |
| --- | --- | --- |
| `docs/chatbridge-presearch.html` | `docs/artifacts/presearch/chatbridge-plugin-platform/` | already contains trust boundary and research synthesis |
| `docs/chatbridge-plugin-architecture.html` | `docs/artifacts/brainlift/chatbridge-plugin-platform/` and decision records | architecture + rationale + integration view |
| `docs/chatbridge-planning-flow.html` | `docs/artifacts/plans/chatbridge-plugin-platform/` | visual rollout and checklist |
| `docs/plans/2026-04-01-chatbridge-finish-plan.md` | implementation appendix | records earlier execution intent |
| K12 plan docs | design/extension artifacts | school policy and distribution overlays |

## Migration Steps

### Step 1

Create plugin-platform presearch artifact with:

- extracted verified facts
- sidecar
- freshness banner
- links to source seed docs

### Step 2

Create plugin-platform brainlift artifact with:

- themes
- SPOVs
- trust boundary
- repo-alignment appendix

### Step 3

Create plugin-platform visual plan artifact with:

- existing build checklist
- current repo truth callouts
- sidecar and stale links

### Step 4

Create plugin-platform verification ledger.

### Step 5

Mark original docs as one of:

- `source-seed`
- `projected-visual`
- `superseded`

## Decision To Make

Recommended:

- keep original docs in place
- do not rewrite history
- create canonical managed copies in artifact folders
- add pointers from original docs later if needed

## Acceptance Criteria

- one full plugin corpus chain exists in canonical artifact folders
- each canonical artifact has sidecar
- original source docs remain discoverable

## Next Artifact

Implementation and verification for plugin-platform chain.
