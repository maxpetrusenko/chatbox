# Engineer Agent

Status: Active design
Cadence: Per implementation wave
Human skim: `docs/agents/index.html#engineer-agent`

## Purpose

Consume implementation contracts and report deltas back into verification.

## Chatbox Rule

If runtime, permission, auth, or heuristic gates are not explicit in the contract, stop and return ambiguity rather than guessing.

## Outputs

- implementation notes
- touched file lists
- verification handoff notes
