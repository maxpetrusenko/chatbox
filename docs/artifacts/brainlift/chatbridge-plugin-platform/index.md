# ChatBridge Plugin Platform Brainlift

Date: 2026-03-31
Artifact ID: `chatbridge-plugin-platform-brainlift`
Status: Published
Project: `chatbox`

Human skim: `docs/artifacts/brainlift/chatbridge-plugin-platform/index.html`

## DOK 1 — Facts

- Existing presearch anchors the trust boundary in sandboxed iframe + structured bridge architecture.
- Existing planning flow uses a five-step rollout with Widget Host first and OAuth Broker last.
- Current repo exposes Installed Plugins and Plugin Drop inside Settings.
- Current repo gates drop by Electron runtime.
- Current repo gates enable/disable by permissions.
- Current repo gates tool exposure by heuristics, K12 scope, and auth.

## DOK 2 — Themes

### Theme A. The platform has split identity

The docs tell the story of a general plugin architecture. The code increasingly tells the story of a managed K12 platform.

### Theme B. Current repo behavior is policy-heavy

Visibility, activation, and tool access are not simple toggles. They are governed by runtime, role, school, auth, and prompt heuristics.

### Theme C. The original docs are strategically right

The core architecture decisions remain strong:

- sandboxed rendering
- structured state publishing
- platform-owned auth

The drift is mostly in product framing and rollout visibility, not in the foundational trust model.

## DOK 3 — Insights

### Insight 1

The canonical plugin artifact chain should preserve the original architecture thesis while adding a repo-alignment layer for current constraints.

### Insight 2

There are really two user-visible stories competing in the same corpus:

- extensible app platform
- district-governed plugin marketplace

If they stay merged without explicit separation, agents will continue to blend them.

### Insight 3

The five-step build order is still useful, but it needs a sixth overlay: policy and product surface reality.

## DOK 4 — SPOVs

### SPOV 1

The right way to document this plugin system is not one architecture doc. It is one architecture chain with explicit “ideal platform” and “shipped gates” layers.

### SPOV 2

For this repo, rollout confusion comes more from hidden gates than from hidden components.

### SPOV 3

If the visual plugin docs do not show runtime and permission gates, they are incomplete for both product and implementation.

## Product Boundary

This artifact chain should describe:

- plugin registration and discovery
- settings surfaces
- drop and install flow
- enable/disable model
- tool invocation exposure
- trust/auth/policy gates

It should not yet try to settle every long-term marketplace question outside current repo reality.

## Risks

- continuing to treat old docs as canonical without sidecars
- failing to distinguish strategic architecture from shipped product constraints
- letting K12-specific behavior silently redefine the general plugin story

## Recommendation

The canonical plugin plan should add a new explicit lane called `Policy + Surface Reality` on top of the old five-step build checklist.

## Next Artifact

Canonical plugin platform plan with six lanes and current-state callouts.
