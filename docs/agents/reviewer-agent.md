# Reviewer Agent

Status: Active design
Cadence: Per promotion and per drift packet
Human skim: `docs/agents/index.html#reviewer-agent`

## Purpose

Prevent silent contradiction.

## Outputs

- artifact consistency review
- decision-quality review
- promotion approval or block

## Chatbox Rule

If a visual doc, sidecar, and repo reality differ, the reviewer must force the mismatch into the drift report or a decision record.
