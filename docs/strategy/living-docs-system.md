# Living Documentation System Strategy

Date: 2026-04-03
Status: Active runtime. First rollout landed
Human skim: `docs/strategy/living-docs-system.html`

## Purpose

This strategy defines a documentation system that acts as a product control plane rather than a passive document dump. The system is designed to serve two audiences at the same time:

- Humans need fast visual scanning, architecture comprehension, and high-signal plan review.
- AI agents need explicit state, evidence, constraints, acceptance criteria, freshness metadata, and downstream impact rules.

The system should reduce ambiguity, preserve intent, and continuously update itself on a schedule so documents do not drift away from the repo, the product, or the original user goal.

The living-docs surface is meant to hold the current best truth for:

- product intent and scope
- user and buyer personas
- user research and evidence
- competitor landscape and market position
- architecture and runtime boundaries
- design system, UX flows, and UI quality bar
- implementation constraints and proof state
- dual projections for humans and AI agents

## Coverage Contract

Every active living-docs chain should answer these questions without requiring a long chat recap:

- what product is being built and why now
- who the target user is, what job they are hiring the product for, and what persona trade-offs matter
- which competitors or adjacent products matter and what we learned from them
- what the architecture, trust boundaries, and runtime constraints are
- what the intended UX, design language, and UI interaction model are
- what work is planned, what is implemented, what is verified, and what drift exists

Coverage is not optional metadata. If one of these domains is unknown, the artifact should mark it as missing or inferred rather than silently omit it.

## Dual Agent Runtime

The next execution standard for this system is documented in:

- `docs/strategy/dual-agent-living-loop.md`
- `docs/strategy/dual-agent-living-loop.html`

That loop adds three explicit runtime layers on top of the existing artifact graph:

- one Claude memory
- one Codex memory
- one shared memory

It also adds two heartbeats at every stage:

- coordination heartbeat
- drift heartbeat

The required behavior is challenge first collaboration. Both agents listen to the same human intent, both read the same artifact chain, and only one human facing reply is emitted at a time.

## Current Status Snapshot

This is no longer only a proposed model.

- `docs/tasks.md` is now the controller board for the program.
- Two canonical chains exist in repo: `chatbox-living-docs` and `chatbridge-plugin-platform`.
- `15` `state.json` sidecars already exist under `docs/artifacts/`.
- Swarm specs, runbooks, decisions, and indexes are now part of the runtime surface.
- Legacy plugin docs now backlink to canonical managed artifacts.
- One weekly refresh run has been executed.
- `scripts/stale-check.mjs` now drives `docs/indexes/stale-report.md`.
- `.github/workflows/stale-check.yml` now schedules weekly stale-check execution.
- One MAX-router Claude task proved canonical-only docs execution.
- Browser render proofs now exist for both visual plan artifacts.
- Local stale-check write plus verify now proves the docs-runtime tooling loop.

## Current Repo Truth

### Control surface

- `docs/tasks.md`
- `docs/indexes/artifacts-index.md`
- `docs/indexes/swarm-dispatch-board.md`
- `docs/indexes/refresh-cadence.md`
- `docs/indexes/stale-report.md`

### Active chains

- `docs/artifacts/presearch/chatbox-living-docs/index.md`
- `docs/artifacts/brainlift/chatbox-living-docs/index.md`
- `docs/artifacts/plans/chatbox-living-docs/index.md`
- `docs/artifacts/implementation/chatbox-living-docs/index.md`
- `docs/artifacts/verification/chatbox-living-docs/index.md`
- `docs/artifacts/drift/chatbox-living-docs/index.md`
- `docs/artifacts/presearch/chatbridge-plugin-platform/index.md`
- `docs/artifacts/brainlift/chatbridge-plugin-platform/index.md`
- `docs/artifacts/plans/chatbridge-plugin-platform/index.md`
- `docs/artifacts/implementation/chatbridge-plugin-platform/index.md`
- `docs/artifacts/verification/chatbridge-plugin-platform/index.md`
- `docs/artifacts/drift/chatbridge-plugin-platform/index.md`

### Governance and refresh

- `docs/decisions/0001-canonical-artifact-graph.md`
- `docs/decisions/0002-dual-artifact-pairing.md`
- `docs/decisions/0003-plugin-corpus-source-seed.md`
- `docs/runbooks/daily.md`
- `docs/runbooks/weekly.md`
- `docs/runbooks/monthly.md`
- `docs/indexes/plugin-source-seed-registry.md`

## Hidden Repo Gates Every Visual Artifact Must Surface

These constraints are easy to miss in prose and must stay visible in design, implementation, verification, and drift artifacts.

- desktop runtime gate in `src/renderer/routes/settings/plugins-drop.tsx:91`
- permission and role gate in `src/renderer/routes/settings/plugins.tsx:124`
- heuristic tool inclusion gate in `src/renderer/packages/model-calls/stream-text.ts:216`
- registry behavior in `src/renderer/stores/pluginRegistry.ts:190`

## Problem

Most project documentation breaks in one of four ways:

1. The most polished visual artifact is not the real source of truth.
2. The AI receives broad architecture prose rather than implementation-grade constraints.
3. Research, plan, UI, implementation, and verification live in different files with no state linkage.
4. Once implementation starts, nobody marks which downstream artifacts are now stale.

This produces the exact failure mode you called out: the human sees a plan in one way, the AI interprets it in another way, and repeated explanation is needed to recover intent.

## Design Principles

### 1. Artifact graph over doc pile

Every meaningful document is an artifact with an id, phase, owner, freshness score, upstream dependencies, downstream dependents, and publish state.

### 2. Human projection + machine sidecar

Every core artifact has two synchronized forms:

- a human-facing visual or narrative file
- a machine-facing structured sidecar

Example:

- `brainlift.html`
- `brainlift.state.json`

### 3. No silent overrides

Downstream artifacts may refine upstream artifacts, but they may not silently contradict them. Contradictions must create either:

- a new decision record
- a stale warning
- a repair packet

### 4. Freshness is first-class state

Every artifact must answer:

- when it was last refreshed
- what source classes it depends on
- what changed since last refresh
- what downstream artifacts are now stale

### 5. Docs are an operating system

The documentation layer is not only for reading. It also drives planning, routing, delegation, review, and refresh.

## External Patterns Incorporated

This strategy combines several strong ideas from existing documentation and architecture systems.

### Diataxis

Divio’s documentation model argues that documentation becomes easier to maintain when it is separated by function: tutorial, how-to, reference, and explanation. That is useful here because the machine sidecar and the visual artifact do different jobs and should not be forced into the same form.

Reference: `https://docs.divio.com/documentation-system/introduction/`

### ADRs

Architectural Decision Records are valuable because they capture a single important decision together with rationale, trade-offs, and consequences. In this system, ADR-like records become the unit of truth for major changes that invalidate downstream artifacts.

Reference: `https://adr.github.io/`

### C4 Model

The C4 model reinforces the need for multiple levels of abstraction and diagram clarity. This maps well to the visual layer: a skim plan should show system context, containers, components, runtime flows, and checklist state without mixing abstraction levels chaotically.

Reference: `https://c4model.com/introduction`

### arc42

arc42 provides a practical communication checklist for architecture documentation: goals, constraints, context, solution strategy, building blocks, runtime view, deployment, cross-cutting concepts, and decisions. This is a strong backbone for the non-visual operating model.

Reference: `https://arc42.org/overview`

### Prompt and context management

Modern AI workflows need explicit control of context windows, tools, memory, and compaction. Long-lived artifact graphs work better than repeatedly pasting prose because the system can decide what structured context to load for the current task.

Reference: `https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview`

## Canonical Artifact Types

### 1. Presearch

Purpose: gather evidence and build source-grounded understanding before planning.

Must include:

- human intent capture
- repo map
- source inventory
- product and market context
- competitor scan
- user and persona inputs
- evidence grading
- open questions
- key constraints
- known risks
- missing information

### 2. Brainlift

Purpose: synthesize research into high-conviction understanding.

Must include:

- DOK 1 facts
- DOK 2 knowledge tree
- DOK 3 insights
- DOK 4 SPOVs
- product thesis
- persona model
- competitor position
- opportunity gaps
- anti-goals
- trust boundary
- product boundary

### 3. Plan

Purpose: translate understanding into an execution path humans can skim and agents can implement.

Must include:

- visual build map
- architecture impact map
- phase order
- acceptance criteria
- blockers and dependencies
- scope boundaries
- implementation contracts needed

### 4. Design

Purpose: define UX and system decisions in enough detail to implement without guesswork.

Must include:

- IA / screen map
- UX flows
- interaction contract
- state model
- UI components or surfaces in scope
- edge cases
- auth / permissions / trust states
- visual quality bar

### 5. Implementation Contract

Purpose: produce precise build instructions for agents.

Must include:

- file touch list
- API contracts
- data contracts
- phase acceptance criteria
- test expectations
- no-go constraints

### 6. Verification Ledger

Purpose: prove what is true now.

Must include:

- verified items
- inferred items
- not-yet-measured items
- test results
- screenshot or UI proof references
- unresolved gaps

### 7. Drift Report

Purpose: identify mismatch between source intent and current reality.

Must include:

- drift dimension
- observed mismatch
- suspected cause
- affected artifacts
- repair recommendation

## Artifact Pairing Model

Each artifact should exist as a pair.

### Human-facing

- HTML or Markdown
- visual, skim-first
- short, opinionated, easy to review
- optimized for product, design, and architecture review by humans

### Machine-facing

- JSON or YAML sidecar
- strict fields
- optimized for loading into agent context
- includes ids, states, freshness, evidence, and acceptance criteria
- optimized for AI execution against the same intent humans approved

Example:

```text
docs/artifacts/plans/chatbridge-plugin-platform/
  plan.html
  plan.md
  plan.state.json
  decisions/
  snapshots/
```

## Artifact Graph Rules

### Rule 1. Every active artifact has one upstream chain

For example:

`presearch -> brainlift -> plan -> design -> implementation-contract -> verification`

### Rule 2. Drift propagates downstream

If `brainlift` changes materially, all downstream artifacts become `review_required` unless explicitly re-confirmed.

### Rule 3. Visual files never carry the full machine load

Do not overload the visual doc with every operational detail. Keep it human-first. Put structure into the sidecar.

### Rule 4. Sidecars must be stable enough for automation

If field names change often, the system becomes brittle. Define a small stable schema and version it.

## Suggested Repo Layout

```text
docs/
  tasks.md
  strategy/
    living-docs-system.html
    living-docs-system.md
    skills-and-agents.md
    artifact-schemas.md
  artifacts/
    presearch/
      <project>/
    brainlift/
      <project>/
    plans/
      <project>/
    design/
      <project>/
    implementation/
      <project>/
    verification/
      <project>/
    drift/
      <project>/
    snapshots/
  indexes/
    artifacts-index.md
    refresh-cadence.md
    stale-report.md
```

## Skills to Build

### Must-have skills

- `presearch`
- `brainlift`
- `spov-extractor`
- `visual-plan`
- `implementation-contract`
- `drift-review`
- `artifact-refresh`
- `phase-gate-review`
- `repo-alignment-audit`
- `rpi-orchestrator`

### Helpful follow-on skills

- `opportunity-gap-mapper`
- `architecture-visualization`
- `verification-ledger`
- `decision-log`
- `freshness-auditor`

## Agents and Responsibilities

This system works best when responsibilities stay separated.

### Research agent

- creates and refreshes presearch
- updates evidence and open questions
- flags missing source classes

### PM agent

- owns `tasks.md`
- promotes artifacts across phase gates
- marks scope boundaries and priorities

### Architect agent

- converts research into brainlift and plan structure
- defines artifact graph and contracts
- owns architectural decisions

### UI agent

- produces skim-first HTML artifacts
- maintains visual grammar and information density

### Engineer agent

- consumes implementation contracts
- reports code deltas back into verification

### Reviewer agent

- checks decision consistency
- blocks silent contradiction

### QA agent

- maintains verification ledger
- links evidence to acceptance criteria

### Repair agent

- owns drift packets
- isolates why reality diverged from plan

## Refresh Cadence

### Daily loop

- check freshness of active artifacts
- compare repo deltas to implementation contracts
- update stale flags
- refresh task board status
- keep product, persona, and design intent aligned with current implementation

### Weekly loop

- rescan active source classes
- rescan product, competitor, and persona evidence where relevant
- update brainlift if research changed materially
- review open questions and unresolved drift
- generate repair packets where needed

### Monthly loop

- archive superseded artifacts
- tighten schemas and templates
- re-evaluate skill inventory
- re-evaluate agent role design

## RPI Operating Loop

RPI means Research -> Plan -> Implement. In this system it becomes a controlled loop rather than a loose slogan.

### Research

- run `presearch`
- synthesize `brainlift`
- publish evidence-backed constraints

### Plan

- generate skim-first visual plan
- generate implementation contract sidecar
- define phase gates and acceptance criteria

### Implement

- delegate bounded work packets
- collect verification evidence
- run drift review against plan and brainlift

### Loop closure

- update artifact freshness
- mark downstream stale when needed
- create follow-on plan if scope changes materially

## Anti-Drift Controls

### 1. Freshness banner

Every artifact should visibly show:

- last refreshed date
- confidence level
- stale status
- changed inputs since last publish

### 2. Explicit contradiction handling

If implementation differs from plan, the system must emit one of these outcomes:

- implementation bug
- plan bug
- new constraint discovered
- scope shift requested

### 3. Downstream stale propagation

When upstream changes, affected downstream artifacts should flip to:

- `stale`
- `review_required`
- `superseded`

### 4. Verification before publish

No artifact should move to `published` unless its acceptance criteria and evidence references are updated.

## Original First Implementation Sequence

The first build sequence below is still useful as the system blueprint. It is no longer the current work frontier because the repo has already landed the initial runtime spine.

## Wave 2 Build Wave

Highest value work now:

1. Verify the first remote run of `.github/workflows/stale-check.yml`.
2. Finalize whether extension plans remain source-seed only or become canonical design artifacts.
3. Decide whether browser-proof capture remains manual or becomes recurring.

## Wave 1 Complete

Wave 1 completion is now proven by all of the following:

1. One weekly refresh run was executed and recorded.
2. Stale reporting became procedural through `scripts/stale-check.mjs`.
3. Remaining legacy plan docs now link back to canonical artifacts.
4. One canonical-only docs task executed through the MAX-router Claude flow.

## Wave 2 Done Signal

Wave 2 is complete when all of the following are true:

1. The stale checker has at least one verified remote scheduled run.
2. Visual proof policy is explicit: manual-only or recurring capture.

## Recommended First Implementation Sequence

### Phase 1

- create artifact schema
- create `presearch` skill
- create `brainlift` skill

### Phase 2

- create visual plan template
- create implementation contract template
- create `rpi-orchestrator` skill

### Phase 3

- create drift packet format
- create daily freshness job
- create weekly refresh routine

### Phase 4

- add repo-local artifact index
- add snapshot and archive flow
- add dashboard or overview page if useful

## Recommendation

Build this as a documentation runtime, not as one more static planning doc. The first successful version should do only a few things extremely well:

1. create one canonical artifact chain
2. keep a human visual projection in sync with a machine sidecar
3. detect stale downstream artifacts automatically
4. refresh itself on a predictable cadence

That is the minimal system that can preserve intent and reduce repeated explanation.
