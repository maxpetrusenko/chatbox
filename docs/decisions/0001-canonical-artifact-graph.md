# ADR 0001 — Canonical Artifact Graph

Date: 2026-03-31
Status: Accepted
Human skim: `docs/decisions/index.html#adr-0001`

## Decision

Use a canonical artifact graph instead of a flat doc set.

## Why

Chatbox already had strong docs, but no stateful control over upstream/downstream truth.

## Consequences

- every active artifact needs a sidecar
- stale propagation becomes possible
- tasks and indexes can track active truth
