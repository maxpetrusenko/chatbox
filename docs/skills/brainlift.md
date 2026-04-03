# Skill Spec — Brainlift

Status: Draft for Chatbox
Owner: Architect agent
Cadence: Weekly after presearch refresh
Human skim: `docs/skills/index.html#brainlift`

## Purpose

Transform presearch into high-conviction understanding for planning.

## Inputs

- latest presearch artifact
- adjacent architecture docs
- current code behavior and drift report

## Required Output

- `docs/artifacts/brainlift/<project>/index.md`
- `docs/artifacts/brainlift/<project>/state.json`

## Workflow

1. Extract DOK 1 facts.
2. Group into DOK 2 themes.
3. Generate DOK 3 insights.
4. Force DOK 4 SPOVs.
5. Define product boundary, trust boundary, risks, and gaps.
6. Name next planning artifact.

## Chatbox-Specific Rule

For this repo, every brainlift must explicitly mention hidden behavior gates when they materially shape user experience or implementation drift.

Examples:

- desktop-only runtime gates
- role and permission gates
- auth gates
- prompt and tool-injection heuristics

## Acceptance Criteria

- no SPOV without evidence chain
- no plan recommendation without product boundary
- no omission of real code gates
