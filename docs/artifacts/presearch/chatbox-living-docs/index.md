# Chatbox Living Docs Presearch

Date: 2026-03-31
Artifact ID: `chatbox-living-docs-presearch`
Status: Published
Project: `chatbox`

Human skim: `docs/artifacts/presearch/chatbox-living-docs/index.html`

## Scope

This presearch is not generic. It is for this repo and this problem:

- turn planning and architecture docs into a living documentation runtime
- keep visual skim docs for humans
- keep machine sidecars for agents
- reduce drift between docs, code, and shipped behavior

## Evidence Rules

- `Verified`: directly inspected in repo
- `Inferred`: synthesis from verified repo state and existing docs
- `Open`: unresolved, needs explicit decision or measurement

## Verified Repo Snapshot

- Docs count: `62` files under `docs/`
- Renderer TypeScript files: `465`
- Plugin-related files: `20`
- Test files: `63`
- Node pin: `v22.7.0`

Verified from:

- `package.json:1`
- `.node-version:1`
- repo file inventory on 2026-03-31

## Verified Existing Seed Material

### Strong visual plan artifacts already exist

- Plugin planning checklist already has strong visual skim behavior in `docs/chatbridge-planning-flow.html:497`
- Plugin architecture deep dive already has rich system explanation in `docs/chatbridge-plugin-architecture.html:1395`
- Plugin presearch already captures trust boundary, structured state, and platform-owned auth in `docs/chatbridge-presearch.html:1328`

### Existing docs are rich but not operational

Verified gaps:

- No project task board existed before this pass.
- No canonical artifact graph existed in `docs/`.
- Existing visual docs are standalone deliverables, not linked stateful artifacts.
- Existing docs do not mark downstream artifacts stale when assumptions change.
- Existing docs do not ship with strict machine sidecars.

## Verified Product/Repo Reality Relevant to Drift

### Plugin UI now exists in settings

- Settings nav exposes plugin pages in `src/renderer/routes/settings/route.tsx:79`
- Settings nav exposes plugin drop in `src/renderer/routes/settings/route.tsx:85`
- Installed plugins page exists in `src/renderer/routes/settings/plugins.tsx:521`

### Plugin drop works only in desktop runtime

- Drop path requires `window.electronAPI.invoke` in `src/renderer/routes/settings/plugins-drop.tsx:86`
- Non-desktop runtime throws: `Plugin package install requires the desktop app runtime` in `src/renderer/routes/settings/plugins-drop.tsx:91`

### Enable/disable is permission-gated

- Install and toggle controls depend on `hasPermission('plugin.install')` in `src/renderer/routes/settings/plugins.tsx:124`
- Managed toggle is hidden behind permission logic in `src/renderer/routes/settings/plugins.tsx:140`
- Read-only toggle path exists for weaker roles in `src/renderer/routes/settings/plugins.tsx:386`

### Plugin tool use is also behavior-gated

- Plugin tools are conditionally injected only if heuristics decide to include them in `src/renderer/packages/model-calls/stream-text.ts:216`
- Actual tool injection happens only inside that gate in `src/renderer/packages/model-calls/stream-text.ts:366`
- K12/auth filters further shrink visible tools in `src/renderer/stores/pluginRegistry.ts:190`

## Core Problem Seen In This Repo

The repo already contains all ingredients of the failure mode Max described:

1. strong human visual plans
2. strong architecture prose
3. real code paths with permissions, runtime checks, and heuristic gating
4. no canonical artifact layer binding those together

That means a human can look at a visual plan and infer one rollout order while an agent sees a broader architecture and implements a different slice.

## Inferred Root Causes

### 1. Visual artifact not treated as controller truth

The plugin visual plan is readable and memorable, but it is not structurally privileged over adjacent prose docs or current code.

### 2. Missing machine-readable sidecars

The repo has rich docs but not strict sidecars carrying:

- acceptance criteria
- source confidence
- stale propagation
- explicit rollout order

### 3. No freshness or stale propagation

When code moves, nothing automatically marks plan/design docs as stale.

### 4. No phase-controller document

The repo had plans and architecture, but not an always-current `tasks.md` controlling:

- active artifact chain
- next build phase
- stale artifacts
- refresh cadence

## Opportunity

This repo is a good seed project for a living-docs runtime because it already has:

- polished visual HTML docs
- architecture writing depth
- concrete product code with real drift risks
- tests and plugin runtime concepts

The missing piece is not content volume. It is artifact control.

## Recommended First Canonical Chain For This Repo

Use this exact project as the first living-docs pilot:

1. `chatbox-living-docs-presearch`
2. `chatbox-living-docs-brainlift`
3. `chatbox-living-docs-rollout-plan`
4. `chatbox-living-docs-skill-specs`
5. `chatbox-living-docs-verification-ledger`

## Open Questions

### Open 1

Should the living-docs system live only in `docs/` files first, or should it also gain scripts for stale checks in the first wave?

### Open 2

Should visual docs be HTML-first, Markdown-first, or dual by default?

### Open 3

Should artifact refresh be driven by git diff, scheduled cron-like review, or both?

### Open 4

Should the first skill specs live as docs-only artifacts or actual reusable agent skill packages in parallel?

## Immediate Next Artifact

Produce a project-specific brainlift that turns this repo snapshot into strong operating beliefs and rollout decisions.
