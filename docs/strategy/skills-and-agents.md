# Skills and Agents Operating Model

Date: 2026-03-31
Status: Proposed
Human skim: `docs/strategy/skills-and-agents.html`

## Goal

Define which skills and which agents should create, review, refresh, and repair each artifact type in the living documentation system.

The operating model must preserve both doc surfaces:

- human docs for skim, review, and decision-making
- AI docs for execution, refresh, verification, and drift repair

It must also preserve the core knowledge domains for each active intent:

- product and scope
- user and persona understanding
- research evidence
- competitor context
- architecture and constraints
- design and UI intent

## Artifact Ownership Matrix

| Artifact | Primary agent | Supporting agents | Required skills | Refresh cadence |
| --- | --- | --- | --- | --- |
| Presearch | Research | Architect, Reviewer | `presearch`, `deep-research`, `repo-alignment-audit` | Weekly, plus on major repo change |
| Brainlift | Architect | Research, PM | `brainlift`, `spov-extractor`, `opportunity-gap-mapper` | Weekly |
| Plan | Architect | PM, UI agent | `visual-plan`, `writing-plans`, `architecture-visualization` | On scope change |
| Design | UI agent | Architect, PM | `frontend-design`, `visual-plan` | On UX change |
| Implementation Contract | PM | Architect, Engineer, Reviewer | `implementation-contract`, `phase-gate-review` | Per implementation wave |
| Verification Ledger | QA | Engineer, Reviewer | `verification-ledger`, `verification-before-completion` | Daily during active build |
| Drift Report | Repair | Reviewer, QA, Architect | `drift-review`, `artifact-refresh` | Daily scan, weekly full review |
| Task Board | PM | All | `writing-plans`, `requesting-code-review` | Daily |

## Proposed Skill Specs

### `presearch`

Purpose: build an evidence-backed first-contact artifact.

Outputs:
- human intent capture
- repo map
- source inventory
- product context
- competitor scan
- user and persona inputs
- evidence grading
- open question ledger
- constraints list
- freshness metadata

### `brainlift`

Purpose: synthesize presearch into product understanding.

Outputs:
- DOK ladder
- themes
- risks
- SPOVs
- product thesis
- competitor position
- persona model
- anti-goals
- trust boundary
- product boundary

### `spov-extractor`

Purpose: force explicit high-conviction claims and tie them to evidence.

Outputs:
- SPOV list
- supporting evidence map
- contradiction list

### `visual-plan`

Purpose: create skim-first human plans with a stable visual grammar.

Outputs:
- build map
- architecture impact view
- sequence view
- checklist view
- risks view
- freshness banner

### `implementation-contract`

Purpose: convert plan into low-ambiguity build packets for agents.

Outputs:
- IA and screen map
- UI states and components in scope
- file touch map
- acceptance criteria
- no-go constraints
- verification hooks

### `drift-review`

Purpose: find divergence between artifact layers and reality.

Outputs:
- drift dimension
- affected artifacts
- likely cause
- repair packet

### `artifact-refresh`

Purpose: refresh artifact metadata and source linkage.

Outputs:
- freshness score update
- stale propagation
- changed-source summary

### `phase-gate-review`

Purpose: decide if an artifact chain is ready to move forward.

Outputs:
- gate result
- missing requirements
- blocked promotions

### `repo-alignment-audit`

Purpose: compare repo state to documented contracts.

Outputs:
- aligned items
- unimplemented items
- undocumented code deltas

### `rpi-orchestrator`

Purpose: run the Research -> Plan -> Implement loop using canonical artifacts.

Outputs:
- next artifact to produce
- stale artifacts to repair
- current implementation packet

## Agent Behavior Rules

### Research agent

- Never writes implementation contracts.
- Can propose questions, risks, and evidence gaps.
- Marks confidence explicitly.

### Architect agent

- Owns artifact graph and structure.
- Can supersede plan artifacts.
- Cannot mark verification complete alone.

### PM agent

- Owns `docs/tasks.md`.
- Controls phase transitions.
- Approves or rejects major scope changes.

### UI agent

- Owns HTML visual artifacts.
- Keeps visual skim quality high.
- Must not become the canonical state holder.

### Engineer agent

- Consumes implementation contracts only.
- Reports deltas back into verification.
- Must flag contract ambiguity instead of guessing.

### Reviewer agent

- Checks contradiction, decision quality, and schema compliance.
- Can reject promotions.

### QA agent

- Owns proof quality.
- Tracks verified vs inferred vs missing.

### Repair agent

- Creates repair packets.
- Never silently rewrites controller truth.

## Scheduled Maintenance Model

### Daily jobs

- task board update
- stale flag refresh
- repo-alignment spot check
- verification ledger cleanup

### Weekly jobs

- presearch refresh
- brainlift review
- drift review across active projects
- skills and gaps review

### Monthly jobs

- archive superseded artifacts
- template and schema refinement
- agent role review

## Recommended First Skill Build Order

1. `presearch`
2. `brainlift`
3. `visual-plan`
4. `implementation-contract`
5. `drift-review`
6. `artifact-refresh`
7. `rpi-orchestrator`
