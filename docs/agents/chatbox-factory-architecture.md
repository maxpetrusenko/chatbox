# Chatbox Subagent Factory Architecture

Status: Proposed and scaffolded
Human skim: `docs/agents/index.html#chatbox-factory-architecture`
Source model: `../software-factory/AGENTS.md`
Companion runtime specs: local `.codex/agents/*.toml` plus `agents/` draft prompts

## Why

Chatbox has two different work modes:

1. product/runtime coding in `src/`
2. living-docs artifact operations in `docs/`

Those workflows are broad enough to blow up a single agent context window. A factory-style subagent split keeps the top-level agent small and routes narrow tasks to role-specific workers.

## Chatbox Mapping

| Factory level | Software Factory role | Chatbox role | Persistence |
| --- | --- | --- | --- |
| L0 | Athena | `swarm-controller` | per initiative |
| L1 | PM | `pm-agent` | per wave |
| L1 | Architect | `architect-agent` | per wave |
| L2 | Workers | `research-agent`, `engineer-agent`, `ui-agent`, `qa-agent`, `reviewer-agent`, `repair-agent` | spawned on demand |

## Routing Rules

### Route to `swarm-controller`

Use first when work is:
- cross-cutting
- multi-file and multi-phase
- likely to need more than one specialist
- likely to overflow parent context

### Route to `pm-agent`

Use when you need:
- task slicing
- acceptance criteria
- a wave plan
- a ship, continue, or escalate call

### Route to `architect-agent`

Use when work touches:
- plugin lifecycle
- auth, permission, or trust boundaries
- session flow
- artifact graph shape
- docs/runtime contract changes

### Route to workers

- `research-agent`: evidence and codebase mapping
- `engineer-agent`: bounded implementation
- `ui-agent`: renderer/UI and visual-doc polish
- `qa-agent`: proof and gate checks
- `reviewer-agent`: contradiction review
- `repair-agent`: drift and recovery

## Standard Handoff Packet

Every subagent packet should include:
- goal
- exact files or folders in scope
- constraints
- expected output
- stop condition
- next agent

## Example: Token-heavy exit-app bug

1. `swarm-controller` frames the goal: reduce local-route token waste.
2. `research-agent` finds the intent and message pipeline.
3. `pm-agent` narrows the packet: only plugin local routes and tests.
4. `engineer-agent` implements terse local replies.
5. `qa-agent` verifies route behavior and focused tests.
6. `reviewer-agent` confirms no docs/runtime contradiction.

Parent agent keeps only orchestration state, not the entire investigation.

## Suggested Operating Loop

1. controller dispatch
2. worker result
3. QA or reviewer gate
4. PM decision
5. optional repair loop


## Chatbox Phase Loop

Adapted from Software Factory, but trimmed for this repo:

1. Research — repo truth, evidence, open questions
2. Shape — architecture decision or scoped packet
3. Build — bounded implementation or artifact update
4. Verify — focused checks, proof splits, gaps
5. Review — contradiction and decision-quality pass
6. Repair — loop only if proof or consistency fails
7. Promote — update task board, artifact status, next lane

Default owner map:
- Research: `research-agent`
- Shape: `architect-agent` or `pm-agent`
- Build: `engineer-agent` or `ui-agent`
- Verify: `qa-agent`
- Review: `reviewer-agent`
- Repair: `repair-agent`
- Promote: `pm-agent`

## Notes

- `docs/agents/*.md` remains the human-readable role catalog.
- local `.codex/agents/*.toml` is the real Codex runtime layer.
- `agents/*.md` is the companion prompt-drafting layer.
- tracked routing and packet docs live in `docs/agents/routing-matrix.md` and `docs/agents/handoff-packets.md`.
- `agents/` is intentionally ignored, so each machine can tune prompts without polluting git history.
