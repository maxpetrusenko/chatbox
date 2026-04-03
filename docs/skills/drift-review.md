# Skill Spec — Drift Review

Status: Draft for Chatbox
Owner: Repair + Reviewer agents
Cadence: Daily scan, weekly deep review
Human skim: `docs/skills/index.html#drift-review`

## Purpose

Find divergence between visual docs, machine sidecars, code reality, and user-visible behavior.

## Inputs

- plan artifacts
- implementation contracts
- verification ledger
- current repo diff

## Required Output

- `docs/artifacts/drift/<project>/index.md`
- `docs/artifacts/drift/<project>/state.json`
- updates to `docs/indexes/stale-report.md`

## Drift Dimensions

- visual plan vs machine sidecar
- docs vs code
- code vs shipped behavior
- repo truth vs agent assumptions

## Chatbox-Specific Priority Checks

1. settings visibility
2. runtime-only gates
3. permission and role gates
4. auth gates
5. tool-injection heuristics

## Acceptance Criteria

- every drift item has evidence
- every drift item names affected artifacts
- every drift item proposes repair path
