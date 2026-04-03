Human skim: `docs/plans/index.html`
# Living Docs Tree Handoff Plan

## Goal

Carry the docs work from “good skim pages” to a reliable living-tree knowledgebase for `chatbox`.

The next agent should treat this as a repo-truth maintenance and completion pass, not a design-system rewrite.

## What This Work Is

The current docs wave is about making the HTML skim layer behave like a living operator tree:

- human skim first
- markdown and sidecars as detail / machine state
- every important page routes to upstream, downstream, proof, drift, and decision nodes
- every major claim stays anchored to current `chatbox` code and current artifact state

Primary repo surfaces behind the tree:

- `src/renderer/routes/settings/plugins.tsx`
- `src/renderer/routes/settings/plugins-drop.tsx`
- `src/renderer/packages/model-calls/stream-text.ts`
- `src/renderer/stores/pluginRegistry.ts`
- `src/shared/plugin-types.ts`
- `src/shared/plugin-protocol.ts`
- `src/renderer/plugins/index.ts`

## What Landed In This Wave

### Human skim hubs

Reworked to read like `chatbox` review surfaces rather than generic docs-framework pages:

- `docs/indexes/living-docs-control-center.html`
- `docs/tasks.html`
- `docs/artifacts/runtime/current/index.html`
- `docs/agents/index.html`
- `docs/reference-index.html`
- `docs/plugin-api.html`
- `docs/indexes/artifacts-index.html`
- `docs/indexes/plugin-source-seed-registry.html`
- `docs/indexes/refresh-cadence.html`
- `docs/indexes/swarm-dispatch-board.html`
- `docs/indexes/stale-report.html`
- `docs/runbooks/index.html`
- `docs/decisions/index.html`
- `docs/skills/index.html`
- `docs/plans/index.html`

### Artifact leaves

Reworked to behave like tree nodes instead of dead-end posters:

- `docs/artifacts/plans/chatbox-living-docs/visual.html`
- `docs/artifacts/plans/chatbridge-plugin-platform/visual.html`
- `docs/artifacts/design/chatbridge-plugin-platform/index.html`
- `docs/artifacts/implementation/chatbox-living-docs/index.html`
- `docs/artifacts/verification/chatbox-living-docs/index.html`
- `docs/artifacts/implementation/chatbridge-plugin-platform/index.html`
- `docs/artifacts/verification/chatbridge-plugin-platform/index.html`

### Markdown/detail layer drift fixes

Updated to match current repo truth and current tree maturity:

- `docs/tasks.md`
- `docs/plugin-api.md`
- `docs/indexes/swarm-dispatch-board.md`
- `docs/indexes/artifacts-index.md`
- `docs/indexes/plugin-source-seed-registry.md`
- `docs/artifacts/presearch/chatbox-living-docs/index.md`
- `docs/artifacts/presearch/chatbridge-plugin-platform/index.md`
- `docs/artifacts/brainlift/chatbox-living-docs/index.md`
- `docs/artifacts/implementation/chatbox-living-docs/index.md`
- `docs/artifacts/verification/chatbox-living-docs/index.md`
- `docs/artifacts/plans/chatbox-living-docs/index.md`
- `docs/artifacts/plans/chatbridge-plugin-platform/index.md`
- `docs/strategy/living-docs-system.md`

### Trust fixes

The following drift bugs were specifically fixed:

- broken canonical plan link in `docs/plans/index.html`
- missing links to the two K12 overlay plans
- stale repo anchors like `plugins.tsx:123` and `plugins.tsx:503`
- split-brain between `plugin-source-seed-registry.html` and `.md`
- stale “planned” status in `docs/tasks.md`
- outdated plugin contract detail in `docs/plugin-api.md`

## Current Tree Read

### What is true now

- the skim layer is now mostly tree-shaped
- major hubs now route into proof, drift, and decision nodes
- artifact leaves now show provenance and next edges
- plugin/runtime claims are much more tightly tied to current repo code
- the runtime skim page now reads shared runtime files directly instead of restating placeholders by hand
- remote stale-check proof is now the main remaining maturity blocker

## Direction Of Travel

The direction is:

1. finish the living tree as an operator knowledgebase for `chatbox`, not a docs showcase
2. make every important skim page route into proof, drift, runtime, and decision ownership
3. keep current shipped plugin/runtime constraints visible at the top layer
4. close the trust loop with remote proof and explicit policy decisions
5. only after that, consider broader automation or more template work

This means the next waves should move:

- from strong page copy -> verified navigation tree
- from local proof -> remote operational proof
- from “legacy docs still exist” -> explicit source-seed versus canonical policy
- from placeholder runtime state -> shared-state-driven runtime skim

## Direction Complete Means

Treat direction as complete when these are true:

1. the main skim tree is navigable end to end without dead ends or misleading hubs
2. repo-truth claims are anchored and current across the active tree
3. one remote stale-check run is verified and reflected in the docs runtime story
4. extension-plan status is explicitly resolved in the decision/registry layer
5. the runtime skim page reads shared state rather than restating placeholders by hand

## Completion Status

- complete: the main skim tree no longer has the known dead-end plan route that was blocking runtime navigation
- complete: repo-truth claims in the active tree were refreshed against current `plugins.tsx`, `plugins-drop.tsx`, `stream-text.ts`, and `pluginRegistry.ts`
- complete: extension-plan status is now explicit in the decision/registry layer as `source-seed overlay` policy
- complete: the runtime skim page now reads shared runtime files directly
- blocked: remote stale-check proof is still not verified from GitHub

### What is still not fully done

- not every older HTML artifact leaf has been given the same node chrome treatment
- some secondary markdown docs outside the active tree may still contain stale line anchors or old framing
- browser render verification was not run for every page in this wave
- remote workflow proof is still pending

## Highest Priority Next Work

### 1. Full render / navigation QA

Open and click through the skim tree in a browser.

Focus:

- `docs/indexes/living-docs-control-center.html`
- `docs/indexes/artifacts-index.html`
- `docs/indexes/plugin-source-seed-registry.html`
- `docs/indexes/refresh-cadence.html`
- `docs/indexes/swarm-dispatch-board.html`
- `docs/tasks.html`
- `docs/artifacts/runtime/current/index.html`
- `docs/plans/index.html`

Check:

- no broken links
- cards feel like routers, not summaries
- no visual regressions from the content changes

### 2. Sweep remaining stale anchor references

Run targeted greps for stale repo anchors, especially:

- `plugins.tsx:123`
- `plugins.tsx:503`
- any old `pluginRegistry.ts` line refs
- any broken `index.html` plan links under `docs/artifacts/plans/`

Focus especially on older markdown and HTML outside the already-touched priority set.

### 3. Update more detail-layer docs where needed

The biggest remaining content-quality mismatch is that some hubs now route into better, newer skim pages while some older markdown detail docs are still mixed-quality or historically framed.

Best candidates:

- legacy reference docs linked from `docs/reference-index.html`
- older plugin docs that still contain weaker contract detail
- any strategy docs still calling the system “planned” where it is now active

### 4. Prove the operational loop

The tree will not feel fully trustworthy until:

1. one remote stale-check workflow run is verified
2. extension-plan status stays explicitly recorded as source-seed overlay policy unless a later canonical branch is approved

Owning nodes:

- `docs/indexes/refresh-cadence.html`
- `docs/indexes/stale-report.html`
- `docs/indexes/plugin-source-seed-registry.html`
- `docs/decisions/index.html`

## Guardrails

- do not turn this into a framework rewrite
- keep HTML as skim layer
- keep markdown as detail / machine layer
- preserve the existing visual system unless a structural content fix demands otherwise
- favor repo-specific claims over system-generic language
- keep proving current shipped behavior versus aspirational design

## Recommended Command Checks

Use these first:

```bash
rg -n "plugins\\.tsx:123|plugins\\.tsx:503|pluginRegistry\\.ts:188|artifacts/plans/chatbridge-plugin-platform/visual.html" docs
```

```bash
rg -n "Human skim:" docs/agents docs/indexes docs/plans
```

```bash
git status --short docs
```

Optional coarse HTML parse:

```bash
xmllint --html --noout docs/indexes/*.html docs/*.html docs/artifacts/**/*.html
```

Note:

- `xmllint` will emit expected HTML5-era warnings for `main`, `section`, and SVG tags
- use it only as a coarse parse pass, not as a standards verdict

## Handoff Summary

The docs are no longer just attractive skim pages. They are much closer to a real living tree.

The next agent should focus on:

1. browser QA and click-path verification
2. stale-anchor cleanup outside the already-reworked core
3. operational proof closure around remote stale-check

Do not spend the next wave rewording everything again unless a page still materially misstates repo truth.
