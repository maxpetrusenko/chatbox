# Skill Spec — Presearch

Status: Draft for Chatbox
Owner: Research agent
Cadence: Weekly for active projects, plus on major repo changes
Human skim: `docs/skills/index.html#presearch`

## Purpose

Create the first canonical artifact for a project or feature using repo-grounded evidence.

## Inputs

- target repo paths
- active docs
- current routes, settings pages, runtime gates
- external references only where needed

## Required Output

- `docs/artifacts/presearch/<project>/index.md`
- `docs/artifacts/presearch/<project>/state.json`

## Chatbox Seed Sources

- `docs/chatbridge-presearch.html`
- `docs/chatbridge-plugin-architecture.html`
- `docs/chatbridge-planning-flow.html`
- `src/renderer/routes/settings/plugins.tsx`
- `src/renderer/routes/settings/plugins-drop.tsx`
- `src/renderer/routes/settings/route.tsx`
- `src/renderer/packages/model-calls/stream-text.ts`
- `src/renderer/stores/pluginRegistry.ts`

## Workflow

1. Count relevant repo surfaces.
2. Record verified facts with file anchors.
3. Separate inferred insights from verified facts.
4. Name current drift risks.
5. Publish open questions.
6. Set next artifact.

## Acceptance Criteria

- repo-specific, not generic
- verified/inferred/open clearly separated
- points to next artifact in chain
- records current code gates that shape real behavior

## Failure Modes

- generic framework prose instead of repo facts
- no file anchors
- no open questions
- ignores runtime, auth, or permission gates
