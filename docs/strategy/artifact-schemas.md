# Artifact Schemas and State Model

Date: 2026-03-31
Status: Proposed
Human skim: `docs/strategy/artifact-schemas.html`

## Purpose

Define a stable machine-facing shape for living documentation artifacts.

The schema should be strong enough to answer both:

- what humans need to review and approve
- what AI agents need to build and verify

## Core Schema

Every active artifact should have a sidecar file, typically `*.state.json`.

### Required fields

```json
{
  "schema_version": "1.0",
  "artifact_id": "chatbridge-plugin-platform-plan",
  "artifact_type": "plan",
  "project_id": "chatbox",
  "title": "ChatBridge Plugin Platform Plan",
  "status": "published",
  "phase": "plan",
  "intent": {
    "problem": "Make plugin install and lifecycle obvious to the right user segments",
    "target_outcome": "Users can discover, install, and trust plugins without setup confusion"
  },
  "audiences": {
    "human": ["founder", "designer", "engineer"],
    "ai": ["claude", "codex", "worker-agent"]
  },
  "owners": ["architect", "pm"],
  "source_classes": ["repo", "product", "competitor", "persona", "design", "ui"],
  "coverage": {
    "product": "covered",
    "competitors": "covered",
    "architecture": "covered",
    "design": "covered",
    "ui": "covered",
    "personas": "partial",
    "research": "covered"
  },
  "upstream_ids": ["chatbridge-plugin-platform-brainlift"],
  "downstream_ids": ["chatbridge-plugin-platform-design"],
  "last_refreshed_at": "2026-03-31",
  "freshness": {
    "score": 0.82,
    "state": "fresh"
  },
  "confidence": "medium",
  "evidence": {
    "verified": 14,
    "inferred": 8,
    "missing": 3
  },
  "acceptance_criteria": [
    "Installed Plugins visible in settings",
    "Desktop drop path accepts .cbplugin",
    "Installed plugin can be enabled or disabled"
  ],
  "open_questions": [
    "Should anonymous users see read-only plugin demos?"
  ],
  "stale_inputs": [],
  "stale_downstream": [],
  "supersedes": null,
  "change_summary": "Initial publish"
}
```

## Status values

- `draft`
- `review_required`
- `published`
- `stale`
- `superseded`
- `archived`

## Freshness states

- `fresh`
- `aging`
- `stale`
- `unknown`

## Artifact Types

- `presearch`
- `brainlift`
- `plan`
- `design`
- `implementation-contract`
- `verification`
- `drift-report`
- `decision-record`

## Coverage field expectations

Each active artifact should declare coverage for the domains that matter to the active intent.

- `product`
- `competitors`
- `architecture`
- `design`
- `ui`
- `personas`
- `research`

Allowed values:

- `covered`
- `partial`
- `missing`
- `not_applicable`

## Propagation Rules

### Upstream changed materially

Downstream artifacts become `review_required`.

### Repo contradicts implementation contract

Emit drift report and mark contract `stale`.

### Verification fails acceptance criteria

Do not promote artifact chain.

## Suggested File Naming

```text
docs/artifacts/<phase>/<project>/<artifact-slug>/
  index.md
  visual.html
  state.json
  decisions/
  snapshots/
```

## Suggested Future Automations

- freshness checker
- stale propagation script
- artifact index builder
- sidecar schema validator

## Runtime Extension For Dual Agent Execution

Active shared runtime state should extend the sidecar model with fields like:

```json
{
  "active_stage": "plan",
  "reply_lock": {
    "held": true,
    "owner": "claude",
    "started_at": "2026-04-03T12:00:00Z"
  },
  "blocked": {
    "status": "blocked",
    "reasons": [
      "remote stale-check proof missing"
    ]
  },
  "proposal_token_owner": "claude",
  "challenge_token_owner": "codex",
  "locked_packet_id": "plan-packet-03",
  "agent_handoffs": {
    "claude": {
      "prompt_ref": "docs/plans/<plan-file>.md:293",
      "dispatch": "Read and execute handoff prompt at docs/plans/<plan-file>.md:293"
    },
    "codex": {
      "prompt_ref": "docs/plans/<plan-file>.md:352",
      "dispatch": "Read and execute handoff prompt at docs/plans/<plan-file>.md:352"
    },
    "extra_refs": [
      "docs/plans/<presearch-file>.md:1",
      "docs/plans/<architecture-file>.md:1",
      "docs/plans/<plan-file>.md:1"
    ]
  },
  "open_disagreements": [
    "Plan packet is still too broad for implementation"
  ],
  "heartbeats": {
    "coordination": {
      "last_updated_at": "2026-04-03T12:03:00Z",
      "status": "active",
      "next_move": "Codex challenge pass"
    },
    "drift": {
      "last_updated_at": "2026-04-03T12:04:00Z",
      "status": "clean",
      "flags": []
    }
  }
}
```

These fields are intentionally runtime oriented. They should live in shared state for the current active intent so both agents can coordinate without passing the entire plan back through chat context.

When prompt docs exist, `agent_handoffs` should store refs and short dispatch strings only. Do not duplicate the full prompt prose in runtime state or chat handoff messages.
