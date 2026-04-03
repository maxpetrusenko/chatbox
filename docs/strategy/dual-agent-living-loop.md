# Dual Agent Living Loop

Date: 2026-04-03
Status: Active target model
Human skim: `docs/strategy/dual-agent-living-loop.html`

## Purpose

Define a shared operating model where Claude and Codex both listen to the same human intent, work across every artifact stage, challenge each other by default, and keep truth in repo artifacts rather than in chat context.

This loop is meant to become the standard runtime for:

- presearch
- brainlift
- design
- plan
- implementation
- review
- fix
- verification
- drift

## Core Invariants

1. One human intent enters the system.
2. Both agents read the same active artifact chain.
3. Only one human facing reply is emitted at a time.
4. Default behavior is constructive disagreement, not fast agreement.
5. No stage advances without proposal, challenge, resolution, proof, and drift scan.
6. Repo artifacts hold current truth. Chat is transport, not memory.
7. Agent dispatch should reference canonical prompt files by `path:line`, not inline full prompt blobs.

## Stage Loop

Every stage uses the same loop.

1. Human intent updates the shared artifact state.
2. One agent proposes the next packet for the active stage.
3. The other agent challenges it and offers a stronger version when possible.
4. The first agent either accepts, counters, or rejects with rationale.
5. Shared state locks the best current packet.
6. Work executes against the locked packet.
7. Proof is recorded.
8. Drift is checked before promotion.

The loop is identical across research, design, planning, implementation, review, fixing, and verification. The only thing that changes is the type of artifact being updated.

## Challenge First Rule

The system should not reward shallow consensus.

- Claude should challenge weak abstractions, under-modeled risk, and fake completeness.
- Codex should challenge repo mismatch, implementation ambiguity, and unproven claims.
- Agreement is only valid after a stronger rejected alternative has been recorded.

Required review outputs:

- best objection
- best alternative
- decision rationale
- proof or gap list

## Memories

The loop uses three memory surfaces.

### Claude memory

Purpose:

- research synthesis
- design intent
- trade-offs
- product reasoning
- narrative continuity

Suggested file:

- `.claude/memory/current.md`

### Codex memory

Purpose:

- repo facts
- commands run
- patch shape
- failures and retries
- verification observations

Suggested file:

- `.codex/memory/current.md`

### Shared memory

Purpose:

- active stage
- locked packet
- disagreement ledger
- proof ledger
- drift flags
- next action
- reply lock

Suggested files:

- `docs/artifacts/runtime/current/state.json`
- `docs/artifacts/runtime/current/log.md`
- `docs/artifacts/runtime/current/proof.md`
- `docs/artifacts/runtime/current/drift.md`

## Heartbeats

Two heartbeats keep the loop honest.

### Coordination heartbeat

Purpose:

- report current stage
- report active proposal owner
- report challenge owner
- report blocked or unblocked state
- report next recommended move

### Drift heartbeat

Purpose:

- compare artifacts to repo state
- compare design to implementation
- compare plan to current code
- compare review claims to proof
- mark stale edges immediately

## Suggested Stage Bias

These are defaults, not permanent roles.

### Early stages

- Claude tends to lead presearch, brainlift, and initial planning.
- Codex tends to challenge evidence quality, repo fit, and missing implementation constraints.

### Middle stages

- The proposing token can move either way during design and plan refinement.
- Locked implementation packets should be narrow and testable.

### Build and proof stages

- Haiku class workers can implement against locked packets.
- Higher capability review passes should challenge the build before promotion.

## Shared Artifact Contract

Each active intent should have a canonical chain and a runtime surface.

```text
docs/artifacts/presearch/<intent>/index.md
docs/artifacts/brainlift/<intent>/index.md
docs/artifacts/design/<intent>/index.md
docs/artifacts/plans/<intent>/index.md
docs/artifacts/plans/<intent>/visual.html
docs/artifacts/implementation/<intent>/index.md
docs/artifacts/verification/<intent>/index.md
docs/artifacts/drift/<intent>/index.md
docs/artifacts/runtime/current/state.json
```

## Shared State Requirements

At minimum, shared state should answer:

- what stage is active
- who currently holds the proposal token
- who currently holds the challenge token
- what packet is locked
- what disagreements remain open
- what proof exists
- what drift has already been detected
- whether a human facing reply is already in flight

## Human Skim Contract

Humans should be able to open a single skim surface and see:

- active stage
- current best packet
- open disagreement
- confidence
- next move
- proof status
- drift status

The skim surface should hide raw back and forth unless the human drills in.

## How To Use It

1. Capture one plain language human intent.
2. Create or update the active intent chain under `docs/artifacts/`.
3. Write the current stage and reply lock into shared runtime state.
4. Record agent handoff refs in shared runtime state when prompts live in repo docs.
5. Dispatch each agent with a short `Read and execute handoff prompt at <path>:<line>` message.
6. Let one agent propose.
7. Force the other agent to challenge and improve.
8. Lock the better packet in shared state.
9. Execute only from the locked packet.
10. Record proof.
11. Run drift heartbeat.
12. Advance only if the stage gate is clean.

## Golden Standard

This is the target standard for collaborative execution in this repo.

When it works well:

- the human repeats intent less
- the plan stays in files, not memory
- challenge quality goes up
- implementation quality goes up
- drift is caught early
- the skim surface stays trustworthy
