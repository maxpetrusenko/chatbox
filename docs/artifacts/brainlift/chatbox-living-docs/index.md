# Chatbox Living Docs Brainlift

Date: 2026-03-31
Artifact ID: `chatbox-living-docs-brainlift`
Status: Published
Project: `chatbox`

Human skim: `docs/artifacts/brainlift/chatbox-living-docs/index.html`

## Core Question

How should this repo turn rich but static visual planning docs into a living documentation system that humans can skim and agents can execute without repeated explanation?

## DOK 1 — Facts

- The repo already has polished visual plugin planning docs in `docs/chatbridge-planning-flow.html:497`.
- The repo already has rich plugin architecture prose in `docs/chatbridge-plugin-architecture.html:1395`.
- The repo already has research-style presearch material in `docs/chatbridge-presearch.html:1328`.
- Settings exposes Installed Plugins and Plugin Drop in `src/renderer/routes/settings/route.tsx:79`.
- Plugin drop requires desktop runtime in `src/renderer/routes/settings/plugins-drop.tsx:91`.
- Enable/disable is permission-gated in `src/renderer/routes/settings/plugins.tsx:124`.
- Tool availability is heuristic-gated in `src/renderer/packages/model-calls/stream-text.ts:216`.

## DOK 2 — Knowledge Tree

### Theme A. The repo is already documentation-heavy

Chatbox does not suffer from lack of documentation. It suffers from lack of canonical artifact control.

### Theme B. Human and agent viewpoints diverge naturally

Humans lock onto the visual build order. Agents absorb adjacent prose, repo realities, and runtime guardrails. Without a controller artifact, both are “reasonable” and still diverge.

### Theme C. Real product behavior is hidden behind gates

Installed plugin UI, plugin drop, enable/disable, and tool activation all have hidden preconditions:

- runtime preconditions
- role/permission preconditions
- auth preconditions
- heuristic prompting preconditions

### Theme D. Existing plugin docs are the right seed corpus

The plugin docs already contain the shape of the future system:

- visual skim plans
- architecture explanation
- presearch and trust boundary language

What they lack is statefulness and refresh behavior.

## DOK 3 — Insights

### Insight 1

The highest-value product is not “more docs”. It is a controller layer over docs.

### Insight 2

Visual docs should stay opinionated and lightweight. The heavy implementation truth belongs in sidecars.

### Insight 3

Drift in this repo is mostly a state-management problem, not a prose problem.

### Insight 4

The first pilot should use the plugin corpus because the repo already contains:

- research
- architecture
- build order
- real code paths
- user-facing confusion history

### Insight 5

The system must model trust and permission boundaries explicitly. In this repo, those are not edge cases. They are core product behavior.

## DOK 4 — SPOVs

### SPOV 1

The most valuable documentation artifact in AI-native product work is not the spec. It is the artifact graph.

### SPOV 2

A beautiful visual plan without a machine sidecar is only half a product. It helps the human and still fails the agent.

### SPOV 3

The right first build is not a dashboard. It is a docs runtime with stale propagation.

### SPOV 4

In codebases where permissions and heuristics shape real behavior, “implementation intent” must include gates as first-class facts or drift is guaranteed.

## Product Boundary

The living-docs system for Chatbox should do this:

- maintain artifact chain in `docs/`
- provide visual skim files for humans
- provide strict sidecars for agents
- mark stale downstream artifacts
- record phase, owners, cadence, acceptance criteria

It should not yet do this in wave 1:

- build a full UI dashboard
- auto-edit code from docs changes
- solve every repo documentation need at once

## Trust Boundary

The controller truth should live in versioned docs artifacts, not in chat history, memory, or ad hoc prompts. Agents may consume artifacts, but should not silently mutate published truth without emitting a new artifact state or decision record.

## Risks

### Risk 1. Too much abstraction too early

If the system starts as generic “knowledge OS” language, it will drift from repo reality again.

### Risk 2. HTML without sidecars

If new visual docs are created without machine state, the old failure mode repeats.

### Risk 3. Sidecars without visual quality

If the human layer becomes dry or ugly, Max will stop using it and the system loses its anchor.

### Risk 4. Refresh without authority

If stale marking exists but nobody owns promotion, the repo accumulates unresolved warning states.

## Opportunity Gaps

### Gap 1

There is no project-local `presearch` artifact chain yet.

### Gap 2

There are no real skill specs bound to this project’s docs runtime.

### Gap 3

There is no daily or weekly refresh routine encoded in repo artifacts.

### Gap 4

There is no verification ledger for docs truth versus code truth.

## Strategic Recommendation

Use Chatbox as the reference implementation for a living-docs system by grounding the first full chain in the plugin corpus and treating this chain as the controller for future skills.

## Next Artifact

Produce a rollout plan with explicit phases, swarm lanes, cadences, and deliverables for this repo.
