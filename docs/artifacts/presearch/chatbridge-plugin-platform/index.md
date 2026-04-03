# ChatBridge Plugin Platform Presearch

Date: 2026-03-31
Artifact ID: `chatbridge-plugin-platform-presearch`
Status: Published
Project: `chatbox`

Human skim: `docs/artifacts/presearch/chatbridge-plugin-platform/index.html`

## Source Seeds

- `docs/chatbridge-presearch.html`
- `docs/chatbridge-plugin-architecture.html`
- `docs/chatbridge-planning-flow.html`
- `src/renderer/routes/settings/route.tsx`
- `src/renderer/routes/settings/plugins.tsx`
- `src/renderer/routes/settings/plugins-drop.tsx`
- `src/renderer/packages/model-calls/stream-text.ts`
- `src/renderer/stores/pluginRegistry.ts`

## Verified Existing Documentation Intent

### Trust boundary

The existing presearch chooses sandboxed iframes plus structured event publishing to contain third-party app risk in `docs/chatbridge-presearch.html:1328`.

### Structured state

The existing presearch explicitly requires apps to publish structured state snapshots so the chatbot can answer follow-up questions from real data in `docs/chatbridge-presearch.html:1338`.

### Platform-owned auth

The existing presearch chooses platform-mediated authentication instead of iframe-owned OAuth in `docs/chatbridge-presearch.html:1347`.

### Build order

The existing planning flow presents a five-step build order:

1. Widget Host
2. Event Bridge
3. Chess Widget
4. Snapshot Store
5. OAuth Broker

Verified in `docs/chatbridge-planning-flow.html:497`.

## Verified Repo Reality

### Settings surfaces now exist

- Installed Plugins nav item exists in `src/renderer/routes/settings/route.tsx:79`
- Plugin Drop nav item exists in `src/renderer/routes/settings/route.tsx:85`

### Installed plugins page is not neutral

The page is K12/role aware and described differently by auth state and role in `src/renderer/routes/settings/plugins.tsx:535`.

### Drop path is desktop-only

The drop inspector requires `window.electronAPI.invoke` and throws otherwise in `src/renderer/routes/settings/plugins-drop.tsx:86`.

### Enable/disable is role and permission gated

Plugin management depends on `hasPermission('plugin.install')` in `src/renderer/routes/settings/plugins.tsx:124`.

### Tooling visibility is heuristic gated

Plugin tools are only injected when `shouldEnablePluginTools(...)` returns true in `src/renderer/packages/model-calls/stream-text.ts:216` and `src/renderer/packages/model-calls/stream-text.ts:366`.

### Tool availability is also K12 and auth filtered

Manifest visibility is narrowed by role, school scope, app auth, and plugin auth in `src/renderer/stores/pluginRegistry.ts:190`.

## Key Tension

The original docs describe a developer-facing plugin platform architecture. The shipped repo behavior is a K12-governed, role-aware, runtime-gated plugin management system.

Both are valid. They are not the same story.

## Inferred Working Thesis

The canonical plugin-platform artifacts must express two layers explicitly:

1. ideal platform architecture
2. current shipped product gates and constraints

Without both layers, either the human or the agent will misread the intended rollout.

## Open Questions

- Is the target product still “open plugin system” or now “district-reviewed plugin platform” first?
- Should consumer-facing plugin UX and K12-governed plugin UX be separate artifact chains?
- Should heuristic tool gating remain part of the intended product model or be treated as an implementation compromise?

## Next Artifact

Canonical brainlift for the plugin platform that reconciles the original architecture docs with current repo behavior.
