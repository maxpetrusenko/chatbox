# Chatbox Handoff Packets

Status: Proposed
Purpose: stable packet format between subagents so parent context stays small.
Human skim: `docs/agents/index.html#handoff-packets`

## Core Packet

Use this shape everywhere.

```md
## Packet
- Goal:
- Why now:
- Scope:
- Non-goals:
- Inputs:
- Constraints:
- Expected output:
- Validation:
- Stop condition:
- Next agent:
```

## Controller -> PM

```md
## Packet
- Goal: turn broad request into an execution wave
- Why now: parent context needs a bounded contract
- Scope: exact folders or files
- Non-goals: unrelated cleanup, broad refactors
- Inputs: request, repo notes, current drift or task board
- Constraints: keep files small, follow repo package manager, no hidden assumptions
- Expected output: scoped wave with acceptance criteria
- Validation: packet is executable without new clarification
- Stop condition: PM emits one clear build packet
- Next agent: engineer-agent or architect-agent
```

## PM -> Engineer

```md
## Packet
- Goal: implement scoped change
- Why now: contract approved
- Scope: `src/...`
- Non-goals: docs rewrite, unrelated tests, opportunistic refactors
- Inputs: exact files, expected behavior, acceptance checks
- Constraints: minimal diff, root-cause fix, add regression test when fit
- Expected output: code + focused test updates + validation notes
- Validation: named commands to run
- Stop condition: checks pass or ambiguity found
- Next agent: qa-agent
```

## Research -> Architect

```md
## Packet
- Goal: convert evidence into a contract or decision
- Why now: repo truth found, shape still unclear
- Scope: affected runtime/docs boundaries
- Inputs: code paths, file refs, contradictions, open questions
- Expected output: architecture decision or clarified contract
- Stop condition: no guessing required by implementer
- Next agent: pm-agent or reviewer-agent
```

## QA -> Reviewer

```md
## Packet
- Goal: final consistency pass after validation
- Inputs: touched files, checks run, proof gaps, failing or skipped cases
- Expected output: approve, block, or smallest next fix
- Stop condition: promotion decision made
- Next agent: pm-agent or repair-agent
```

## Example: Exit-App Token Bug

```md
## Packet
- Goal: keep generic app exit routes local and terse
- Why now: model fallback wastes tokens
- Scope: `src/renderer/plugins/chat-intents.ts`, `src/renderer/stores/session/messages.ts`, focused tests
- Non-goals: broader chat routing overhaul
- Inputs: failing transcript, current intent flow, active-plugin state behavior
- Constraints: preserve existing plugin followups, do not widen tool injection
- Expected output: local route resolution + terse ambiguity replies + regressions
- Validation: focused vitest file, touched-file lint
- Stop condition: transcript no longer falls through to model
- Next agent: qa-agent
```
