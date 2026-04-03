# Repo Alignment Appendix — ChatBridge Plugin Platform

Date: 2026-03-31
Parent artifact: `chatbridge-plugin-platform-brainlift`
Human skim: `docs/artifacts/brainlift/chatbridge-plugin-platform/repo-alignment-appendix.html`

## Purpose

Make current repo behavior explicit alongside the original plugin architecture thesis.

## Original Thesis

- sandboxed plugin host
- structured state bridge
- platform-owned auth
- build sequence from host to OAuth broker

## Current Repo Behavior

### Settings surface exists

- Installed Plugins and Plugin Drop routes are real settings surfaces now.

### Drop is runtime-bounded

- Plugin package review/install path depends on Electron bridge availability.

### Management is policy-bounded

- Enable/disable is not universally visible.
- Role, permission, and current scope matter.

### Tool exposure is model-behavior-bounded

- Tools are not always present.
- Prompt heuristics and auth/K12 filters affect exposure.

## Alignment Result

### Still aligned

- trust boundary design
- state publication model
- platform-owned auth strategy

### Needs explicit overlay

- settings and marketplace surface behavior
- desktop-only install path
- permission-gated activation
- heuristic tool routing

## Recommendation

Treat the plugin platform as:

- architecturally: extensible plugin system
- operationally: managed, policy-heavy plugin platform

Both must appear in canonical docs.
