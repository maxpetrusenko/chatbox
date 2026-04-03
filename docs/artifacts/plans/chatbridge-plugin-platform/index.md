# ChatBridge Plugin Platform Plan

Date: 2026-03-31
Artifact ID: `chatbridge-plugin-platform-plan`
Status: Proposed
Project: `chatbox`
Human skim: `docs/artifacts/plans/chatbridge-plugin-platform/visual.html`

## Goal

Upgrade the original plugin build checklist into a canonical plan that combines architecture sequence with shipped product gates.

## Canonical Lanes

### 1. Widget Host

Iframe mount, sandbox, host wrapper, rendering surface.

### 2. Event Bridge

State update, completion, error signaling, host/plugin contract.

### 3. First Reference App

Chess widget as full-contract proof.

### 4. Snapshot Context

Structured state to conversation context.

### 5. Platform Auth Broker

Platform-mediated auth and scoped capabilities.

### 6. Policy + Surface Reality

Current repo gates that shape user-visible truth:

- desktop-only drop
- role and permission gated activation
- auth-gated availability
- heuristic tool exposure

## Why Lane 6 Exists

Because the current repo is not just an architecture playground. It is a product with real control surfaces and gates. If Lane 6 is omitted, the plan is visually elegant and operationally incomplete.

## Current Repo Truth Callouts

- Installed Plugins page: `src/renderer/routes/settings/plugins.tsx:521`
- Plugin Drop route: `src/renderer/routes/settings/plugins-drop.tsx:40`
- desktop-only drop: `src/renderer/routes/settings/plugins-drop.tsx:91`
- permission-gated management: `src/renderer/routes/settings/plugins.tsx:124`
- heuristic tool inclusion: `src/renderer/packages/model-calls/stream-text.ts:216`

## Deliverables For Canonical Plugin Chain

1. plugin presearch artifact
2. plugin brainlift artifact
3. plugin visual plan artifact
4. plugin implementation contract
5. plugin verification ledger
6. plugin drift report

## Acceptance Criteria

- six-lane model is visible in visual plan
- source seed docs remain referenced
- shipped gates are first-class callouts
- implementation and verification artifacts follow

## Next Artifact

Visual HTML version of this canonical plugin plan.
