# ADR 0002 — Human Projection + Machine Sidecar

Date: 2026-03-31
Status: Accepted
Human skim: `docs/decisions/index.html#adr-0002`

## Decision

Each important artifact should have a human-facing file and a machine-facing sidecar.

## Why

Visual docs alone failed agents. Prose alone failed skim quality.

## Consequences

- HTML/Markdown remains human-first
- JSON sidecars remain agent-first
- neither form should silently replace the other
