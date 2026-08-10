---
name: add-plugin
description: Workflow command scaffold for add-plugin in chatbox.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-plugin

Use this workflow when working on **add-plugin** in `chatbox`.

## Goal

Adds a new plugin to the ChatBridge platform, including manifest, implementation, and UI.

## Common Files

- `src/renderer/plugins/*/manifest.ts`
- `src/renderer/plugins/*/index.ts`
- `src/renderer/plugins/*/ui.html`
- `src/renderer/plugins/index.ts`
- `src/renderer/routes/__root.tsx`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update src/renderer/plugins/<plugin>/manifest.ts
- Create or update src/renderer/plugins/<plugin>/index.ts
- Create or update src/renderer/plugins/<plugin>/ui.html
- Update src/renderer/plugins/index.ts to register the new plugin
- Optionally update src/renderer/routes/__root.tsx to auto-init or QA the plugin

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.