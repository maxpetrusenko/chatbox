# Skill Spec — Visual Plan

Status: Draft for Chatbox
Owner: UI agent
Cadence: On every phase promotion or major scope change
Human skim: `docs/skills/index.html#visual-plan`

## Purpose

Create skim-first HTML plans for humans while preserving a strict machine sidecar for agents.

## Inputs

- latest brainlift
- latest plan sidecar
- active risks and stale report

## Required Output

- `docs/artifacts/plans/<project>/visual.html`
- `docs/artifacts/plans/<project>/state.json`
- optional `index.md`

## Visual Grammar

Must include:

- hero with goal and current status
- phase strip or checklist
- owner lanes / swarm lanes
- current truth / real repo facts
- immediate next deliverables

Must not:

- become the only source of truth
- hide freshness state
- omit known runtime or permission gates

## Chatbox-Specific Reference Style

Use the density and clarity of:

- `docs/chatbridge-planning-flow.html`
- `docs/chatbridge-plugin-architecture.html`

but improve them by adding:

- freshness state
- current repo truth
- explicit next actions
- machine-sidecar compatibility
