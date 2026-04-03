# Runtime Shared Memory

This folder holds the active shared runtime state for the dual agent living loop.

## Purpose

Keep current coordination truth in files so Claude and Codex do not need the entire active plan passed back through chat context.

## Current Files

- `current/state.json` — active stage, reply lock, packet lock, heartbeats
- `current/log.md` — event log for proposal, challenge, resolution, promotion
- `current/proof.md` — current proof ledger
- `current/drift.md` — current drift ledger

## Usage

1. Run `pnpm docs:runtime:refresh` or `node scripts/runtime-heartbeat.mjs --write` to rewrite `current/state.json`, `current/log.md`, `current/proof.md`, and `current/drift.md`.
2. Run `pnpm docs:runtime:verify` or `node scripts/verify-runtime-heartbeat.mjs` to confirm the runtime files stay coherent.
3. Pass remote run metadata from CI so the runtime can record remote proof, not only local proof.
4. Keep handoff refs in `current/state.json` aligned with the active intent chain.

## Dispatch Contract

Agent handoffs should be reference-first.

- Send the worker a short command that points at the canonical handoff prompt by file and line.
- Do not paste the full handoff prompt blob into chat if the prompt already lives in repo docs.
- Keep the shared runtime state aligned with the same refs so Claude and Codex read the same source of truth.

Preferred shape:

```md
Claude: Read and execute handoff prompt at docs/plans/<plan-file>.md:<line>
Codex: Read and execute handoff prompt at docs/plans/<plan-file>.md:<line>
```

If extra context is needed, send only adjacent canonical refs, not duplicated prompt prose:

```md
Useful refs:
- presearch: docs/plans/<presearch-file>.md:1
- architecture: docs/plans/<architecture-file>.md:1
- phase 1 plan: docs/plans/<plan-file>.md:1
```
