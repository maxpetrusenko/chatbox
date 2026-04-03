# Chatbox Living Docs Rollout Plan

Date: 2026-03-31
Artifact ID: `chatbox-living-docs-rollout-plan`
Status: Proposed
Project: `chatbox`
Human skim: `docs/artifacts/plans/chatbox-living-docs/visual.html`

## Goal

Turn `docs/` into a living artifact runtime for this repo, starting from the plugin documentation corpus and expanding into reusable skills and refresh routines.

## Success Criteria

### Human success

- Max can skim one HTML and understand architecture, current phase, risks, and next build order fast.
- Visual docs show freshness, ownership, and what changed.

### Agent success

- Agents load sidecars instead of guessing from prose.
- Acceptance criteria and gates are explicit.
- Downstream stale propagation exists.

### Repo success

- `docs/tasks.md` becomes the active control surface.
- Artifact folders contain real project data.
- At least one project chain is refreshed on cadence.

## Swarm Lanes

### Lane A — Research

Owner: Research agent

Outputs:
- presearch refresh
- source delta log
- open question review

Cadence:
- weekly

### Lane B — Architecture

Owner: Architect agent

Outputs:
- brainlift refresh
- decisions
- artifact graph updates

Cadence:
- weekly and on major scope change

### Lane C — Visual Docs

Owner: UI agent

Outputs:
- HTML skim docs
- visual grammar refinement
- stale/freshness banners

Cadence:
- on every phase promotion

### Lane D — Implementation Contracts

Owner: PM + Engineer agents

Outputs:
- bounded work packets
- file touch plans
- verification hooks

Cadence:
- per build wave

### Lane E — Drift + Repair

Owner: Repair + Reviewer agents

Outputs:
- stale report
- repair packets
- contradiction handling

Cadence:
- daily scan

## Phase Plan

### Phase 0 — Bootstrap controller truth

Deliver:
- `docs/tasks.md`
- `docs/indexes/*`
- artifact folder skeleton
- project-specific presearch, brainlift, and rollout plan

Status:
- in progress now

### Phase 1 — Skill spec layer

Deliver:
- `presearch` skill spec
- `brainlift` skill spec
- `visual-plan` skill spec
- `implementation-contract` skill spec
- `drift-review` skill spec

Acceptance:
- each skill has inputs, outputs, cadence, failure modes, and owning agents

### Phase 2 — Artifact templates

Deliver:
- reusable `index.md`
- reusable `visual.html`
- reusable `state.json`
- reusable decision record template

Acceptance:
- new project artifact can be instantiated in under 10 minutes

### Phase 3 — Verification + stale propagation

Deliver:
- verification ledger format
- stale rules
- repair packet format

Acceptance:
- upstream change can mark downstream stale explicitly in docs

### Phase 4 — Refresh cadence runtime

Deliver:
- daily routine doc
- weekly routine doc
- monthly archive routine doc

Acceptance:
- owners and expected outputs per cadence are explicit

### Phase 5 — Plugin corpus migration

Deliver:
- convert plugin docs into canonical artifact chain
- attach sidecars to plugin presearch, brainlift, and plan artifacts

Acceptance:
- plugin work becomes the first fully-managed living-docs chain in this repo

## Dependencies

- existing plugin docs remain the source seed
- sidecar schema remains stable enough to reuse
- tasks board is kept current

## Current Known Risks

- generic framework drift
- too many artifact types too early
- first remote living-docs refresh proof still missing

## Recommendation

The first real artifact chain has now proven useful. Keep the runtime heartbeat and stale refresh automated, and spend the next trust work on remote proof rather than more local doc mechanics.

## Immediate Next Deliverables

1. verify the first remote living-docs refresh run
2. keep source-seed overlay policy explicit in the registry
3. maintain browser proof when the visual docs change materially
