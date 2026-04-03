# Research Agent

Status: Active design
Cadence: Weekly, or on major repo change
Human skim: `docs/agents/index.html#research-agent`

## Purpose

Refresh presearch artifacts with repo-grounded evidence.

## Chatbox Focus

- plugin corpus
- docs runtime structure
- hidden runtime and permission gates

## Inputs

- repo files
- current presearch artifacts
- current source-seed registry

## Outputs

- refreshed presearch docs
- evidence count updates
- open questions updates
- stale-input flags when source truth changed

## Handoff

- sends refreshed artifact to architect agent
- notifies repair agent if drift discovered
