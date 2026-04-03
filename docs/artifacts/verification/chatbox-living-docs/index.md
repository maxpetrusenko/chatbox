# Chatbox Living Docs Verification Ledger

Date: 2026-04-03
Artifact ID: `chatbox-living-docs-verification-ledger`
Status: In progress
Project: `chatbox`

Human skim: `docs/artifacts/verification/chatbox-living-docs/index.html`

## Purpose

Track what is actually proven in the living-docs rollout and what remains inferred or unverified.

## Verified

- `docs/tasks.md` exists and is updated for the living-docs program.
- project-specific presearch artifact exists.
- project-specific brainlift artifact exists.
- project-specific rollout plan exists.
- project-specific visual HTML rollout artifact exists.
- project-specific implementation contract exists.
- project-specific skill specs exist.
- stale report names real Chatbox plugin drift items.
- migrated plugin verification artifact exists.
- repo-alignment appendix exists inside the canonical plugin chain.
- first manual weekly refresh was executed.
- script-assisted stale checker exists at `scripts/stale-check.mjs`.
- runtime heartbeat writer exists at `scripts/runtime-heartbeat.mjs`.
- stale report schema verifier exists at `scripts/verify-stale-report.mjs`.
- remaining legacy plan docs now backlink into the canonical chain.
- Claude Haiku via MAX router completed one canonical-artifacts-first backlink task.
- browser render proof captured at `docs/artifacts/verification/chatbox-living-docs/browser-proof.png`.
- local code-path proof exists: `pnpm docs:refresh-runtime`.
- product-facing code-path proof exists: plugin settings now surface the AI intent gate via `src/renderer/lib/plugin-gates.ts` and `src/renderer/routes/settings/plugins.tsx`.

## Verified With Repo Anchors

- Installed Plugins page exists in `src/renderer/routes/settings/plugins.tsx:521`
- Plugin Drop route exists in `src/renderer/routes/settings/plugins-drop.tsx:40`
- plugin settings nav entries exist in `src/renderer/routes/settings/route.tsx:79`
- desktop runtime gate exists in `src/renderer/routes/settings/plugins-drop.tsx:91`
- permission gate exists in `src/renderer/routes/settings/plugins.tsx:124`
- tool inclusion gate exists in `src/renderer/packages/model-calls/stream-text.ts:216`

## Inferred

- the docs runtime is now usable as a pilot control surface for this repo
- the plugin corpus is the best first migration target
- artifact conventions are stable enough for lightweight refresh automation

## Not Yet Verified

- scheduled living-docs refresh workflow is configured, but first remote execution is not yet verified

## Proof Gaps

### Gap 1

No verified remote run yet for `.github/workflows/stale-check.yml`.
Canonical-only proof now exists for docs-runtime tooling, heartbeat automation, and one product-facing settings surface. Remaining proof is remote schedule verification.

## Publish Gate

This artifact chain should not be considered mature until:

1. stale check runs on a verified schedule, not only manually

## Next Artifact

Refreshed project drift report with post-refresh repair packets.
