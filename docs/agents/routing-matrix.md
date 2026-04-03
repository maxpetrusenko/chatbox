# Chatbox Subagent Routing Matrix

Status: Proposed
Human skim: `docs/agents/index.html#routing-matrix`
Companion docs:
- `docs/agents/chatbox-factory-architecture.md`
- `docs/strategy/skills-and-agents.md`
- local runtime prompts in `agents/`

## Goal

Make dispatch boring and repeatable.

If a request matches one row clearly, route there first. If it spans multiple rows, start with `swarm-controller`.

## Request -> Agent

| Request shape | First agent | Why |
| --- | --- | --- |
| broad feature, many files, unclear sequencing | `swarm-controller` | orchestration first |
| task slicing, acceptance criteria, scope boxing | `pm-agent` | tactical packet writer |
| architecture, trust boundary, lifecycle, schema | `architect-agent` | system contract owner |
| repo investigation, code path tracing, evidence gathering | `research-agent` | fast read-only mapper |
| bounded implementation with clear contract | `engineer-agent` | execution worker |
| renderer UX polish, visual docs, HTML plans | `ui-agent` | visual specialist |
| proof, focused tests, gate quality | `qa-agent` | verification owner |
| contradiction review, promotion review | `reviewer-agent` | quality block or approve |
| drift, stale docs, broken packet recovery | `repair-agent` | diagnosis and repair |

## Common Chatbox Examples

### Product runtime

| Request | Route |
| --- | --- |
| "fix token-heavy exit app route" | `research-agent` -> `pm-agent` -> `engineer-agent` -> `qa-agent` |
| "add new plugin lifecycle event" | `architect-agent` -> `pm-agent` -> `engineer-agent` -> `qa-agent` -> `reviewer-agent` |
| "why does session state duplicate here" | `research-agent` |
| "tighten plugin auth gates" | `architect-agent` -> `engineer-agent` -> `qa-agent` |

### Living docs

| Request | Route |
| --- | --- |
| "refresh plugin-platform presearch" | `research-agent` -> `architect-agent` |
| "update tasks board for this wave" | `pm-agent` |
| "make the HTML plan clearer" | `ui-agent` -> `reviewer-agent` |
| "docs and repo disagree" | `repair-agent` -> `reviewer-agent` |

## Escalation Rules

Escalate back to `swarm-controller` when:
- more than one artifact owner is required
- scope changes mid-task
- a worker finds contract ambiguity
- repo truth and docs truth conflict in multiple places
- validation reveals unrelated systemic breakage

Escalate to `architect-agent` when:
- a bug is really a contract issue
- hidden auth, permission, or state assumptions appear
- a worker would otherwise guess a lifecycle rule

Escalate to `pm-agent` when:
- scope needs to shrink
- acceptance criteria are missing
- work needs rebatched into smaller packets

## Parallelism Rules

Allowed in parallel:
- research on one lane + implementation on another lane
- UI artifact polish + verification ledger refresh
- review of packet A while engineer works packet B

Not allowed in parallel:
- two agents editing the same file
- two agents writing canonical truth for the same artifact chain
- engineer and repair both patching the same drift area
