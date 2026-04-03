# Swarm Controller

Status: Active design
Owner: PM + Architect
Human skim: `docs/agents/index.html#swarm-controller`

## Purpose

Coordinate the living-docs artifact graph for Chatbox.

## Core Responsibilities

- choose active project chain
- route work to subagents
- prevent conflicting truth updates
- promote artifacts across phase gates
- mark stale downstream artifacts
- update `docs/tasks.md`

## Active Projects

- `chatbox-living-docs`
- `chatbridge-plugin-platform`

## Dispatch Rules

### Allowed parallel lanes

- research refresh
- visual doc update
- verification refresh
- drift review

### Not allowed in parallel

- two agents editing the same artifact file
- two agents promoting conflicting canonical truths

## Required Inputs

- `docs/tasks.md`
- `docs/indexes/artifacts-index.md`
- current stale report
- current verification ledgers

## Required Outputs

- updated priorities
- active lane assignments
- gate decision

## Daily Controller Checklist

1. read stale report
2. read verification ledgers
3. decide next artifact promotion
4. route drift to repair agent
5. update task board
