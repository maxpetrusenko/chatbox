# Living Docs System — Task Board

Last updated: 2026-04-03
Status: Active. Weekly refresh executed. stale checker and backlink wave landed
Owner: Max Petrusenko
Human skim: `docs/tasks.html`

## Intent

Build a living documentation system that does four jobs at once:

1. Give humans fast, visual, skim-friendly architecture and plan artifacts.
2. Give AI agents structured, non-visual implementation context with minimal ambiguity.
3. Keep research, plan, design, implementation, and verification artifacts linked and freshness-aware.
4. Prevent drift by running scheduled refresh, drift review, and downstream stale-marking.

Coverage contract for each active chain:

- product and scope
- user and persona model
- research evidence
- competitor context
- architecture and runtime constraints
- design system, UX flows, and UI intent
- one human-facing doc surface and one AI-facing sidecar surface

## Canonical Outputs

- Visual system overview: `docs/strategy/living-docs-system.html`
- Full operating model: `docs/strategy/living-docs-system.md`
- Dual-agent loop spec: `docs/strategy/dual-agent-living-loop.md`
- Dual-agent skim view: `docs/strategy/dual-agent-living-loop.html`
- Skills and agents model: `docs/strategy/skills-and-agents.md`
- Artifact schemas and state model: `docs/strategy/artifact-schemas.md`
- Initial skill specs: `docs/skills/README.md`
- Script-assisted stale check: `scripts/stale-check.mjs`

## Ordered Next Tasks

| # | Task | Status | Notes |
| --- | --- | --- | --- |
| 1 | Initialize shared runtime memory under `docs/artifacts/runtime/current/` | Done | starter `state.json`, `log.md`, `proof.md`, `drift.md` landed |
| 2 | Lock dual-agent shared state schema for reply lock, proposal token, challenge token, packet lock, and heartbeats | Done | schema hook landed in `docs/strategy/artifact-schemas.md` |
| 3 | Build coordination heartbeat that updates current stage, token owners, blocked state, and next move | Done | `scripts/runtime-heartbeat.mjs` now rewrites shared runtime state from the current artifact chain and stale report |
| 4 | Build drift heartbeat that compares active artifacts to repo truth and writes stale edges | Done | runtime heartbeat now rewrites runtime drift/proof/log files and exposes blockers in the dashboard |
| 5 | Create runtime skim surface that shows stage, locked packet, objection, proof, and drift in one view | Done | `docs/artifacts/runtime/current/index.html` now reads the shared runtime files directly |
| 6 | Verify first remote living-docs refresh run and record proof | Next | closes the remaining trust gap on scheduled automation |

## Active Project Artifacts

| Artifact | Status | Notes |
| --- | --- | --- |
| `docs/artifacts/presearch/chatbox-living-docs/index.md` | Published | Real repo evidence captured |
| `docs/artifacts/brainlift/chatbox-living-docs/index.md` | Published | Repo-specific insights and SPOVs |
| `docs/artifacts/plans/chatbox-living-docs/index.md` | Proposed | Rollout plan for this repo |
| `docs/artifacts/plans/chatbox-living-docs/visual.html` | Proposed | Human skim projection |
| `docs/artifacts/implementation/chatbox-living-docs/index.md` | Proposed | bounded implementation contract |
| `docs/artifacts/verification/chatbox-living-docs/index.md` | In progress | proof ledger |
| `docs/artifacts/drift/chatbox-living-docs/index.md` | Active | current drift and repair packets |
| `docs/artifacts/plans/chatbox-plugin-corpus-migration/index.md` | Proposed | migrate existing plugin docs into canonical chain |
| `docs/artifacts/presearch/chatbridge-plugin-platform/index.md` | Published | canonical migrated plugin presearch |
| `docs/artifacts/brainlift/chatbridge-plugin-platform/index.md` | Published | canonical migrated plugin brainlift |
| `docs/artifacts/plans/chatbridge-plugin-platform/index.md` | Proposed | canonical migrated plugin plan |
| `docs/artifacts/plans/chatbridge-plugin-platform/visual.html` | Proposed | canonical migrated plugin visual plan |
| `docs/artifacts/implementation/chatbridge-plugin-platform/index.md` | Proposed | canonical plugin implementation contract |
| `docs/artifacts/verification/chatbridge-plugin-platform/index.md` | In progress | canonical plugin verification ledger |
| `docs/artifacts/drift/chatbridge-plugin-platform/index.md` | Active | canonical plugin drift report |
| `docs/indexes/plugin-source-seed-registry.md` | Active | legacy-to-canonical plugin doc map |
| `docs/artifacts/design/chatbox-living-docs/index.md` | Proposed | living-docs visual rules |
| `docs/artifacts/design/chatbridge-plugin-platform/index.md` | Proposed | plugin-platform visual rules |
| `docs/artifacts/runtime/current/state.json` | Active | shared stage, reply lock, token owners, heartbeats |
| `docs/artifacts/runtime/current/log.md` | Active | proposal and challenge ledger |
| `docs/artifacts/runtime/current/proof.md` | Active | shared proof ledger |
| `docs/artifacts/runtime/current/drift.md` | Active | shared drift ledger |
| `docs/indexes/swarm-dispatch-board.md` | Active | active lane assignments |

## Active Skill Specs

| Skill | Status | Purpose |
| --- | --- | --- |
| `docs/skills/presearch.md` | Draft | project-first evidence capture |
| `docs/skills/brainlift.md` | Draft | DOK ladder + SPOVs |
| `docs/skills/visual-plan.md` | Draft | skim-first HTML plan |
| `docs/skills/implementation-contract.md` | Draft | bounded execution packet |
| `docs/skills/drift-review.md` | Draft | mismatch detection and repair |

## Active Swarm Layer

| Agent doc | Status | Role |
| --- | --- | --- |
| `docs/agents/swarm-controller.md` | Active | controller and promotion owner |
| `docs/agents/research-agent.md` | Active | presearch refresh |
| `docs/agents/architect-agent.md` | Active | graph, brainlift, plans |
| `docs/agents/pm-agent.md` | Active | task board and gates |
| `docs/agents/ui-agent.md` | Active | visual skim docs |
| `docs/agents/engineer-agent.md` | Active | implementation packets |
| `docs/agents/qa-agent.md` | Active | verification ledger |
| `docs/agents/reviewer-agent.md` | Active | contradiction prevention |
| `docs/agents/repair-agent.md` | Active | drift and repair |

## Program Status

| Workstream | Status | Outcome |
| --- | --- | --- |
| Presearch system | Active | Published project presearch artifacts and source intake flow exist |
| Brainlift system | Active | Published brainlift artifacts and repo-grounded tensions exist |
| RPI orchestrator | Active | Research → Plan → Implement loop is operating across the active chains |
| Visual plan system | Active | HTML skim docs for humans are live across indexes and artifact leaves |
| Machine sidecars | Active | JSON state sidecars landed under canonical artifact folders |
| Dual-agent runtime | Active | challenge-first loop, shared runtime skim is live, and heartbeat automation now refreshes the runtime files |
| Drift control | Active | Weekly refresh executed, stale checker landed, repair packets tracked |
| Refresh cadence | Active | Daily/weekly/monthly review jobs exist; remote workflow proof still pending |
| Skills and agents runtime | Active | Named skills and assigned agents exist; some skill specs remain draft |

## Epics

### E1. Artifact Graph

Goal: define the canonical artifact types, upstream/downstream rules, freshness model, and state transitions.

Subtasks:
- Define canonical artifact set.
- Define required sidecar schema.
- Define stale propagation rules.
- Define publish and supersede rules.
- Define archive and snapshot rules.

Suggested owners:
- Architect agent
- Reviewer agent

Suggested skills:
- `presearch`
- `brainlift`
- `artifact-graph`
- `architecture-decision-records`

### E2. Presearch Pipeline

Goal: create the first phase artifact that turns repo + market + source scan into evidence-backed context.

Subtasks:
- Define source classes: repo, docs, issues, competitors, product, market, user, legal.
- Define evidence grading: verified, inferred, unverified, stale.
- Define open questions ledger.
- Define scheduled refresh rules.
- Define output split: human summary + machine sidecar.

Suggested owners:
- Research agent
- Architect agent

Suggested skills:
- `presearch`
- `deep-research`
- `repo-alignment-audit`

### E3. Brainlift Pipeline

Goal: upgrade presearch into high-conviction product understanding.

Subtasks:
- Encode DOK 1–4 ladder.
- Extract themes, constraints, SPOVs, risks.
- Add opportunity gaps and anti-goals.
- Add product boundary and trust boundary.
- Link every SPOV to evidence.

Suggested owners:
- Research agent
- PM agent
- Architect agent

Suggested skills:
- `brainlift`
- `spov-extractor`
- `opportunity-gap-mapper`

### E4. Visual Intent System

Goal: create visual docs that humans can skim fast and that agents can treat as the human-facing projection of canonical state.

Subtasks:
- Define visual doc grammar.
- Standardize sections: map, flow, lifecycle, risks, checklist, current state.
- Standardize visual file pairs with sidecars.
- Add freshness banner and stale warnings.
- Add “what changed” block.

Suggested owners:
- UI agent
- Architect agent

Suggested skills:
- `visual-plan`
- `frontend-design`
- `architecture-visualization`

### E5. RPI Orchestrator

Goal: define the controller that turns research into plan into implementation without losing intent.

Subtasks:
- Define phase gates.
- Define artifact promotion rules.
- Define acceptance criteria extraction.
- Define repair packets when drift appears.
- Define implementation contract generation.

Suggested owners:
- PM agent
- Orchestration agent
- Repair agent

Suggested skills:
- `rpi-orchestrator`
- `implementation-contract`
- `phase-gate-review`

### E6. Drift Control

Goal: detect and repair divergence between intention, docs, repo, and shipped UI.

Subtasks:
- Define drift dimensions.
- Define daily freshness checks.
- Define weekly source refresh.
- Define stale downstream propagation.
- Define repair packet format.

Suggested owners:
- Repair agent
- Reviewer agent
- QA agent

Suggested skills:
- `drift-review`
- `artifact-refresh`
- `verification-before-completion`

### E7. Docs Runtime in Repo

Goal: give the system a stable folder structure and artifact conventions inside `docs/`.

Subtasks:
- Create artifact folders by phase.
- Define naming rules.
- Define state sidecar location.
- Define snapshots and archives.
- Define task index update rules.

Suggested owners:
- Architect agent
- PM agent

Suggested skills:
- `docs-runtime`
- `writing-plans`
- `requesting-code-review`

### E8. Dual Agent Runtime

Goal: operationalize the challenge-first Claude + Codex loop across every artifact stage with separate local memories, shared runtime truth, and stage heartbeats.

Subtasks:
- Lock the shared runtime schema and starter files.
- Verify the first remote living-docs refresh run.
- Record extension-plan policy closure once decided.
- Create a skim-first runtime dashboard from shared state.
- Define stage promotion rules for proposal, challenge, proof, and drift.

Suggested owners:
- Architect agent
- Reviewer agent
- Repair agent

Suggested skills:
- `artifact-refresh`
- `drift-review`
- `phase-gate-review`
- `writing-plans`

## Proposed Folder Layout

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
    brainlift/
    plans/
    design/
    implementation/
    verification/
    drift/
    snapshots/
  indexes/
    artifacts-index.md
    refresh-cadence.md
    stale-report.md
```

## Refresh Cadence

### Daily

- Stale check across active artifacts.
- Repo diff against implementation contracts.
- Open questions triage.
- Task board status refresh.

### Weekly

- Re-run source review for active projects.
- Re-score freshness and confidence.
- Rebuild drift report.
- Revisit top SPOVs and constraints.

### Monthly

- Archive superseded artifacts.
- Review skill inventory.
- Review agent role quality and gaps.
- Tighten schemas and templates.

## Phase Gates

| Phase | Required output | Gate |
| --- | --- | --- |
| Presearch | Evidence-backed repo and problem map | Enough truth to stop guessing |
| Brainlift | Themes, SPOVs, constraints, risks | Enough conviction to plan |
| Plan | Human visual plan + machine contract | Enough clarity to implement |
| Design | UI/system specs + deltas | Enough specificity to build |
| Implementation | PR-ready contract packets | Enough bounded work to delegate |
| Verification | Proof ledger | Enough evidence to publish |
| Drift | Drift report + repair packet | Enough signal to refresh or repair |

## Immediate Next Moves

1. Instantiate canonical plugin-platform artifact chain.
2. Add plugin verification follow-up after appendix lands.
3. Decide whether to convert more legacy docs with backlinks.
4. Decide if scripts enter wave 2.
5. Decide source-seed versus superseded labeling for old plugin docs.
6. Run first weekly refresh cycle manually.
