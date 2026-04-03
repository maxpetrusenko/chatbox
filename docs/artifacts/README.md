# Artifacts Directory

This directory holds phase-scoped, project-specific living artifacts.

## Phases

- `presearch/`
- `brainlift/`
- `plans/`
- `design/`
- `implementation/`
- `verification/`
- `drift/`
- `snapshots/`

## Rule

Each active artifact should live in its own folder and include:

- a human-facing file such as `index.md` or `visual.html`
- a machine sidecar such as `state.json`
- optional `decisions/` and `snapshots/`
