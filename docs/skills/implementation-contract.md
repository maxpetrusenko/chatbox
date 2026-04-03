# Skill Spec — Implementation Contract

Status: Draft for Chatbox
Owner: PM + Engineer agents
Cadence: Per implementation wave
Human skim: `docs/skills/index.html#implementation-contract`

## Purpose

Translate plan artifacts into bounded build packets agents can execute with low ambiguity.

## Inputs

- latest plan sidecar
- latest stale report
- latest brainlift

## Required Output

- `docs/artifacts/implementation/<project>/index.md`
- `docs/artifacts/implementation/<project>/state.json`

## Must Include

- file touch list
- acceptance criteria
- hidden gates and preconditions
- verification hooks
- no-go constraints

## Chatbox-Specific Rule

For any user-facing feature, explicitly record:

- role requirements
- auth requirements
- runtime requirements
- model/tool heuristics if they influence behavior

## Failure Modes

- leaving gates implicit
- copying broad architecture prose
- not bounding changed files
