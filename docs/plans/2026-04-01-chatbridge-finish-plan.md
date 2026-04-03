Human skim: `docs/plans/index.html#chatbridge-finish`
# ChatBridge Finish Plan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the assignment-complete ChatBridge layer on top of Chatbox: true plugin registration, inline embedded apps, completion signaling, context retention, 3 required apps, at least 1 production auth flow, and submission artifacts.

> **Canonical reference:** Source-seed historical implementation snapshot. For current plugin platform state, use `docs/artifacts/implementation/chatbridge-plugin-platform/index.md` first, then return here for original execution detail.

**Architecture:** Keep the current chat stack. Add a manifest-driven plugin host, a narrow postMessage bridge, a registry store, and a platform-owned auth broker. Convert chess from standalone route to the first real plugin, then add one public external app and one authenticated external app. Keep the route-based chess page as fallback/manual QA surface until the inline plugin path is stable.

**Tech Stack:** Electron, electron-vite, React, TanStack Router, Zustand, Mantine, Vitest, sandboxed iframes, postMessage, OAuth2 PKCE, optional device flow.

---

## Source of Truth

- `docs/requirements.md` — grading rubric, required features, auth rules, deliverables
- `docs/chatbridge-presearch.html` — chosen architecture: sandboxed iframe, manifest registry, platform-owned auth
- `docs/chatbridge-plugin-architecture.html` — concrete plugin contract, message protocol, file map
- `docs/plans/2026-03-30-chess-chat-stabilization-handoff.md` — current state, shipped chess v1, deferred generic plugin work

---

## Current Implementation Snapshot

### Done now

- Plugin types exist in `src/shared/plugin-types.ts`
- Plugin protocol + guards exist in `src/shared/plugin-protocol.ts`
- Protocol tests exist in `src/shared/plugin-protocol.test.ts`
- Registry store exists in `src/renderer/stores/pluginRegistry.ts`
- Registry tests exist in `src/renderer/stores/pluginRegistry.test.ts`
- Plugin bootstrap exists in `src/renderer/plugins/index.ts`
- Root bootstrap exists in `src/renderer/routes/__root.tsx`
- Inline iframe host exists in `src/renderer/components/PluginFrame.tsx`
- Channel hook exists in `src/renderer/hooks/usePluginChannel.ts`
- Inline message renderer exists in `src/renderer/components/PluginFrameInline.tsx`
- Chess bundled plugin exists in `src/renderer/plugins/chess/manifest.ts` and `src/renderer/plugins/chess/ui.html`
- Model tool injection exists in `src/renderer/packages/model-calls/toolsets/plugin-tools.ts` and `src/renderer/packages/model-calls/stream-text.ts`
- Focused bridge tests exist in `src/renderer/hooks/usePluginChannel.test.ts` and `src/renderer/components/PluginFrame.test.tsx`

### Partially done

- Tool invocation bridge now works through `plugin-tool-invoke` → `PluginFrame` → `TOOL_RESULT`
- Plugin instances can be created by the tool layer, but chat UX around instance mount is not yet fully proven
- Chess plugin UI exists, but full requirement-grade inline lifecycle still needs end-to-end wiring and validation

### Not done yet

- No public external plugin shipped
- No authenticated plugin shipped
- No platform-owned auth broker shipped
- No developer-facing plugin API docs shipped
- No cost analysis shipped
- No deploy/demo submission assets shipped

---

## Gap Review

### Critical product gaps

1. **Plugin UI mount path is incomplete**
   - Registry/tool plumbing exists, but the assistant message path still needs guaranteed insertion of a `plugin` content part when a plugin instance is created.
   - Without that, the iframe may never render inline even though the tool executes.

2. **Tool call and iframe lifecycle are not yet proven end to end**
   - We have unit coverage for the bridge.
   - We still need integration coverage for: model tool call → plugin instance creation → plugin frame render → state update → follow-up answer using latest plugin state.

3. **Context retention from plugin state into later prompts is still open**
   - Registry stores `lastState` and `lastCompletion`.
   - Prompt/context builder integration for those snapshots is not yet verified.

4. **Auth architecture is still unimplemented**
   - Requirements need at least one authenticated third-party app.
   - Current repo has no platform-owned OAuth broker for plugins yet.

5. **App count still below requirement**
   - Current state: only chess.
   - Required ship state: chess + public app + authenticated app.

### Technical gaps

1. **No plugin content-part insertion helper yet**
   - Add one small helper near tool execution or streaming result handling.
   - It should append `{ type: 'plugin', pluginId, instanceId, toolCallId }` exactly once per instance/tool mount event.

2. **No integration test for plugin message rendering yet**
   - Need a test that asserts `PluginFrameInline` appears after plugin tool execution.

3. **Plugin state not yet fed into context-management pipeline**
   - Review `src/renderer/packages/context-management/` and session generation paths.
   - Add a compact plugin snapshot layer so follow-up prompts see current app state.

4. **No timeout/retry UX for plugin tool promises beyond simple timeout**
   - The bridge rejects after timeout.
   - Chat should show a visible error card and preserve chat stability.

5. **Node mismatch solved operationally, not ergonomically**
   - Working command: `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"`
   - Nice-to-have: add a short repo note or helper command so every run uses Node 20/22 consistently.

### Submission gaps

- API docs
- setup guide updates
- deployed app link
- AI cost analysis
- demo script/video
- social post

---

## Revised Critical Path

1. Finish plugin mount insertion path
2. Add integration test for plugin lifecycle render
3. Verify chess inline end-to-end
4. Feed plugin state into follow-up prompt context
5. Add public weather plugin
6. Add OAuth broker
7. Add Spotify plugin
8. Write docs + cost analysis + demo assets

Do not start extra auth/app experiments before steps 1 through 4 are green.

---

## Presearch Findings

1. **K12 Install Model: LTI 1.3 Dynamic Registration**
   The dominant K12 pattern across platforms such as Canvas, Google, and Clever is admin-first enablement, not teacher self-installation. Teachers may request apps, but installation only proceeds after a district or school administrator authorizes the integration. For ChatBridge, this means plugin onboarding should follow a request → review → approval → assignment flow, rather than direct teacher-side installs.

2. **COPPA 2025 Final Rule**
   The updated COPPA rule, effective April 22, 2026, raises the compliance bar for children’s products with opt-in defaults and penalties up to $51,744 per child per violation. Every plugin manifest should therefore include a structured `data_profile` describing what student data is collected, whether identifiers or PII are processed, how long data is retained, whether data is shared onward, and whether any data is used for model training or product improvement.

3. **FERPA and District Authorization**
   Under FERPA’s school-official framework, districts may authorize approved educational tools through contract and policy controls without requiring per-parent consent in every case. In practice, this means a plugin should not move beyond pending review unless there is a valid district legal basis, typically a signed DPA or equivalent district approval. No DPA, no activation.

4. **Child Safety Moderation Pipeline**
   A K12-safe plugin platform needs layered safety controls, not a single moderation check. A practical pipeline is:
   - OpenAI Moderation for fast, low-cost triage
   - Azure Content Safety for severity scoring
   - Prompt Shields or equivalent jailbreak detection
   - custom district blocklists and policy rules
   - final LLM output scan before student-visible delivery

   This should feed per-student and per-plugin abuse and risk scoring, with escalation paths for repeated or severe incidents.

5. **Plugin Signing and Trust Levels**
   A strong signing model should mirror mature plugin ecosystems such as Grafana: signed manifests, SHA-256 file checksums, publisher identity, and trust tiers. Recommended trust levels:
   - `community`
   - `verified`
   - `district`

   This supports revocation, version pinning, publisher reputation, and safer rollout of third-party plugins in school environments.

6. **Runtime Enforcement in Electron**
   Plugin manifests should declare `allowedDomains[]`, and the host should enforce them with Electron `session.webRequest` controls. Combined with iframe sandboxing, CSP, secret scanning, and bundle inspection for embedded credentials, this gives a practical runtime boundary for untrusted plugin code. Declared permissions must be enforceable, not just informational.

7. **Lifecycle and Governance States**
   A K12 plugin should move through a full governance pipeline before student exposure. Recommended lifecycle:
   `submitted → validated → scanned → reviewed → approved → dpa_signed → active | revoked`

   If finer operational control is needed, add `assigned` between `approved` and `active` to distinguish district approval from classroom rollout.

8. **K12 Governance Model for ChatBridge**
   Students should never be allowed to install plugins. Teachers may request plugins and assign approved ones to classes, but the curated catalog, publisher trust, policy controls, and emergency revoke authority should sit with a central district or platform authority. AI can pre-screen plugins for child safety, but high-risk or novel publishers should still require human approval. Scheduled AI audits should review plugin logs for unsafe outputs, abnormal behavior, policy drift, and repeated abuse signals over time.

---

## Recommended App Set

### Required ship set

1. **Chess** — internal, no auth, high-state, bidirectional, completion + context retention
2. **Weather Lab** — external public, no user auth, quick win for manifest/tool/UI lifecycle
3. **Spotify Study DJ** — external authenticated, OAuth Authorization Code + PKCE, playlist + currently playing UI

### Stretch if time remains

4. **GitHub Repo Coach** — external authenticated, Device Flow, ideal to prove second auth pattern on desktop

### Why this mix

- Covers the required chess scenario
- Covers all 3 app categories from requirements: internal, external public, external authenticated
- Shows 2 auth patterns if stretch app lands: popup PKCE and device flow
- Keeps one low-risk app for demo stability

---

## Swarm Order

### Lane A — Platform core

- Plugin types
- Plugin protocol
- Registry store
- Plugin host iframe
- Completion + state retention

### Lane B — Chess conversion

- Chess manifest
- Chess plugin UI
- Tool mapping
- Inline mount in chat transcript

### Lane C — Public app

- Weather manifest
- Weather tool + widget
- Error and loading states

### Lane D — Auth broker

- OAuth store
- PKCE flow
- Token refresh
- Scoped session capability handoff

### Lane E — Auth app

- Spotify plugin first
- GitHub device-flow plugin second if time remains

### Lane F — Submission

- API docs
- setup guide
- cost analysis
- demo script
- deploy checklist

---

## Task 1: Lock the plugin contract

**Files:**
- Create: `src/shared/plugin-types.ts`
- Create: `src/shared/plugin-protocol.ts`
- Test: `src/shared/plugin-protocol.test.ts`
- Modify: `src/shared/types.ts`

**Step 1: Write the failing test**

Add `src/shared/plugin-protocol.test.ts` for:
- valid `plugin.json` parsing
- host → plugin message narrowing
- plugin → host message narrowing
- rejection of malformed `STATE_UPDATE` and `COMPLETION`

**Step 2: Run test to verify it fails**

Run: `pnpm test src/shared/plugin-protocol.test.ts`

**Step 3: Write minimal implementation**

In `src/shared/plugin-types.ts`, define:
- `PluginManifest`
- `PluginToolDefinition`
- `PluginAuthDefinition`
- `PluginWidgetDefinition`
- `PluginCompletionPayload`

In `src/shared/plugin-protocol.ts`, define:
- `HostToPluginMessage`
- `PluginToHostMessage`
- `isPluginManifest`
- `isPluginToHostMessage`
- `isHostToPluginMessage`

Keep contract tiny. Required messages only:
- `PLUGIN_INIT`
- `TOOL_INVOKE`
- `AUTH_STATUS`
- `PLUGIN_READY`
- `STATE_UPDATE`
- `COMPLETION`
- `ERROR`

**Step 4: Run test to verify it passes**

Run: `pnpm test src/shared/plugin-protocol.test.ts`

**Step 5: Commit**

```bash
git add src/shared/plugin-types.ts src/shared/plugin-protocol.ts src/shared/plugin-protocol.test.ts src/shared/types.ts
git commit -m "feat: add plugin manifest and protocol types"
```

---

## Task 2: Build registry + loader

**Files:**
- Create: `src/renderer/stores/pluginRegistry.ts`
- Create: `src/renderer/stores/pluginRegistry.test.ts`
- Create: `src/renderer/plugins/index.ts`
- Modify: `src/renderer/routes/__root.tsx`

**Step 1: Write the failing test**

Test these behaviors in `src/renderer/stores/pluginRegistry.test.ts`:
- load manifests from known plugin list
- reject duplicate plugin ids
- expose model tool set
- create an active instance with stable `instanceId`
- persist latest plugin snapshot by chat session

**Step 2: Run test to verify it fails**

Run: `pnpm test src/renderer/stores/pluginRegistry.test.ts`

**Step 3: Write minimal implementation**

In `src/renderer/plugins/index.ts`:
- export an array of local manifests for now
- no zip install yet

In `src/renderer/stores/pluginRegistry.ts`:
- store manifests
- store active instances
- derive `getToolSet()` for current chat context
- persist `lastState`, `lastCompletion`, `authStatus`

Do not build remote install yet. Static registry first.

**Step 4: Run test to verify it passes**

Run: `pnpm test src/renderer/stores/pluginRegistry.test.ts`

**Step 5: Commit**

```bash
git add src/renderer/stores/pluginRegistry.ts src/renderer/stores/pluginRegistry.test.ts src/renderer/plugins/index.ts src/renderer/routes/__root.tsx
git commit -m "feat: add plugin registry store"
```

---

## Task 3: Build the sandboxed plugin host

**Files:**
- Create: `src/renderer/components/PluginFrame.tsx`
- Create: `src/renderer/hooks/usePluginChannel.ts`
- Create: `src/renderer/components/PluginFrame.test.tsx`
- Modify: `src/renderer/components/chat/ChatMessage.tsx`
- Modify: `src/renderer/components/session/Thread.tsx`

**Step 1: Write the failing test**

In `src/renderer/components/PluginFrame.test.tsx`, test:
- iframe mounts with sandbox
- host ignores messages before nonce/instance match
- `PLUGIN_READY` triggers `PLUGIN_INIT`
- `STATE_UPDATE` writes into registry
- `COMPLETION` writes completion and resumes chat state

**Step 2: Run test to verify it fails**

Run: `pnpm test src/renderer/components/PluginFrame.test.tsx`

**Step 3: Write minimal implementation**

In `src/renderer/components/PluginFrame.tsx`:
- render iframe with restrictive sandbox
- handshake timeout at 10s
- origin check when origin is known
- nonce check always

In `src/renderer/hooks/usePluginChannel.ts`:
- centralize `postMessage`
- cleanup listeners on unmount
- ignore late messages after completion

Render plugin cards inline in chat transcript, not as standalone route.

**Step 4: Run test to verify it passes**

Run: `pnpm test src/renderer/components/PluginFrame.test.tsx`

**Step 5: Commit**

```bash
git add src/renderer/components/PluginFrame.tsx src/renderer/hooks/usePluginChannel.ts src/renderer/components/PluginFrame.test.tsx src/renderer/components/chat/ChatMessage.tsx src/renderer/components/session/Thread.tsx
git commit -m "feat: add inline plugin iframe host"
```

---

## Task 4: Route model tool calls into plugins

**Files:**
- Modify: `src/renderer/routes/session/$sessionId.tsx`
- Modify: `src/shared/models/index.ts`
- Modify: `src/shared/models/types.ts`
- Create: `test/integration/plugin-lifecycle/tool-routing.test.ts`

**Step 1: Write the failing test**

Cover:
- model sees plugin-derived tools
- tool call routes to correct plugin instance
- plugin ack produces assistant-visible progress
- invalid plugin/tool name returns structured error

**Step 2: Run test to verify it fails**

Run: `pnpm test:integration test/integration/plugin-lifecycle/tool-routing.test.ts`

**Step 3: Write minimal implementation**

- inject active plugin tools into model call only for active/allowed plugins
- namespace tool names as `plugin__<pluginId>__<toolName>`
- convert tool responses into structured assistant context
- show loading/progress card while plugin is active

**Step 4: Run test to verify it passes**

Run: `pnpm test:integration test/integration/plugin-lifecycle/tool-routing.test.ts`

**Step 5: Commit**

```bash
git add src/renderer/routes/session/$sessionId.tsx src/shared/models/index.ts src/shared/models/types.ts test/integration/plugin-lifecycle/tool-routing.test.ts
git commit -m "feat: route model tool calls through plugin registry"
```

---

## Task 5: Convert chess into the first real plugin

**Files:**
- Create: `src/renderer/plugins/chess/plugin.json`
- Create: `src/renderer/plugins/chess/ui.html`
- Create: `src/renderer/plugins/chess/ui.ts`
- Modify: `src/renderer/lib/chess/engine.ts`
- Modify: `src/renderer/routes/chess/index.tsx`
- Test: `test/integration/plugin-lifecycle/chess-plugin.test.ts`

**Step 1: Write the failing test**

Test full flow:
- user says `let's play chess`
- model calls `plugin__chess__start_game`
- chess plugin mounts inline
- plugin emits FEN snapshot after move
- assistant answers `what should I do here?` using latest snapshot
- plugin emits completion at game over

**Step 2: Run test to verify it fails**

Run: `pnpm test:integration test/integration/plugin-lifecycle/chess-plugin.test.ts`

**Step 3: Write minimal implementation**

- move reusable chess state code out of route into shared helper if needed
- keep route page as manual fallback harness
- manifest tools:
  - `start_game`
  - `apply_move`
  - `get_position`
  - `finish_game`
- state payload must include `fen`, `moveHistory`, `statusLine`, `difficulty`

**Step 4: Run test to verify it passes**

Run: `pnpm test:integration test/integration/plugin-lifecycle/chess-plugin.test.ts`

**Step 5: Commit**

```bash
git add src/renderer/plugins/chess/plugin.json src/renderer/plugins/chess/ui.html src/renderer/plugins/chess/ui.ts src/renderer/lib/chess/engine.ts src/renderer/routes/chess/index.tsx test/integration/plugin-lifecycle/chess-plugin.test.ts
git commit -m "feat: convert chess into an inline plugin"
```

---

## Task 6: Add the public external app

**Files:**
- Create: `src/renderer/plugins/weather/plugin.json`
- Create: `src/renderer/plugins/weather/ui.html`
- Create: `src/renderer/plugins/weather/ui.ts`
- Create: `src/main/plugins/weather.ts`
- Test: `test/integration/plugin-lifecycle/weather-plugin.test.ts`
- Docs: `docs/adding-plugin.md`

**Step 1: Write the failing test**

Cover:
- model routes weather question to weather plugin
- plugin loads forecast widget
- tool result survives follow-up question
- API failure returns visible error card

**Step 2: Run test to verify it fails**

Run: `pnpm test:integration test/integration/plugin-lifecycle/weather-plugin.test.ts`

**Step 3: Write minimal implementation**

- use Open-Meteo HTTP API
- no stored user auth
- tools:
  - `lookup_forecast`
  - `lookup_air_quality`
- widget shows selected city, next 12 hours, summary chip row

**Step 4: Run test to verify it passes**

Run: `pnpm test:integration test/integration/plugin-lifecycle/weather-plugin.test.ts`

**Step 5: Commit**

```bash
git add src/renderer/plugins/weather/plugin.json src/renderer/plugins/weather/ui.html src/renderer/plugins/weather/ui.ts src/main/plugins/weather.ts test/integration/plugin-lifecycle/weather-plugin.test.ts docs/adding-plugin.md
git commit -m "feat: add public weather plugin"
```

---

## Task 7: Build the auth broker

**Files:**
- Create: `src/main/auth/oauth-store.ts`
- Create: `src/main/auth/oauth-broker.ts`
- Create: `src/main/auth/providers/spotify.ts`
- Create: `src/shared/types/plugin-auth.ts`
- Modify: `src/main/deeplinks.ts`
- Modify: `src/preload/index.ts`
- Test: `test/integration/plugin-auth/oauth-broker.test.ts`

**Step 1: Write the failing test**

Cover:
- broker starts PKCE session
- verifier/state persisted
- callback exchanges code
- encrypted refresh token saved
- expired access token refreshes automatically
- widget receives only scoped session capability, not raw refresh token

**Step 2: Run test to verify it fails**

Run: `pnpm test:integration test/integration/plugin-auth/oauth-broker.test.ts`

**Step 3: Write minimal implementation**

- main process owns auth flow
- generate PKCE verifier/challenge server-side
- use owned popup / system browser
- store tokens in platform storage, encrypted if existing secret infra is available
- expose minimal IPC:
  - `startPluginAuth(pluginId)`
  - `getPluginAuthStatus(pluginId)`
  - `revokePluginAuth(pluginId)`

**Step 4: Run test to verify it passes**

Run: `pnpm test:integration test/integration/plugin-auth/oauth-broker.test.ts`

**Step 5: Commit**

```bash
git add src/main/auth/oauth-store.ts src/main/auth/oauth-broker.ts src/main/auth/providers/spotify.ts src/shared/types/plugin-auth.ts src/main/deeplinks.ts src/preload/index.ts test/integration/plugin-auth/oauth-broker.test.ts
git commit -m "feat: add platform owned oauth broker"
```

---

## Task 8: Add Spotify Study DJ

**Files:**
- Create: `src/renderer/plugins/spotify/plugin.json`
- Create: `src/renderer/plugins/spotify/ui.html`
- Create: `src/renderer/plugins/spotify/ui.ts`
- Create: `src/main/plugins/spotify.ts`
- Test: `test/integration/plugin-auth/spotify-plugin.test.ts`

**Step 1: Write the failing test**

Cover:
- user asks for study playlist
- assistant requests auth
- PKCE connect succeeds
- playlist search/create works
- current playback and selected playlist show in widget

**Step 2: Run test to verify it fails**

Run: `pnpm test:integration test/integration/plugin-auth/spotify-plugin.test.ts`

**Step 3: Write minimal implementation**

- tools:
  - `search_playlist`
  - `create_playlist`
  - `add_tracks`
  - `get_current_playback`
- widget states:
  - disconnected
  - connecting
  - connected
  - action success/error

**Step 4: Run test to verify it passes**

Run: `pnpm test:integration test/integration/plugin-auth/spotify-plugin.test.ts`

**Step 5: Commit**

```bash
git add src/renderer/plugins/spotify/plugin.json src/renderer/plugins/spotify/ui.html src/renderer/plugins/spotify/ui.ts src/main/plugins/spotify.ts test/integration/plugin-auth/spotify-plugin.test.ts
git commit -m "feat: add spotify study plugin"
```

---

## Task 9: Add second auth pattern with GitHub device flow (stretch)

**Files:**
- Create: `src/main/auth/providers/github.ts`
- Create: `src/renderer/plugins/github/plugin.json`
- Create: `src/renderer/plugins/github/ui.html`
- Create: `src/renderer/plugins/github/ui.ts`
- Create: `src/main/plugins/github.ts`
- Test: `test/integration/plugin-auth/github-device-flow.test.ts`

**Step 1: Write the failing test**

Cover:
- assistant asks user to connect GitHub
- broker returns `user_code`, `verification_uri`, `interval`
- UI shows verification step
- polling stops on success or timeout
- plugin can fetch repos/issues after auth

**Step 2: Run test to verify it fails**

Run: `pnpm test:integration test/integration/plugin-auth/github-device-flow.test.ts`

**Step 3: Write minimal implementation**

- tools:
  - `list_repos`
  - `list_issues`
  - `summarize_repo`
- UI shows device code card and connected repo summary
- keep device polling in main process, never widget

**Step 4: Run test to verify it passes**

Run: `pnpm test:integration test/integration/plugin-auth/github-device-flow.test.ts`

**Step 5: Commit**

```bash
git add src/main/auth/providers/github.ts src/renderer/plugins/github/plugin.json src/renderer/plugins/github/ui.html src/renderer/plugins/github/ui.ts src/main/plugins/github.ts test/integration/plugin-auth/github-device-flow.test.ts
git commit -m "feat: add github device flow plugin"
```

---

## Task 10: Submission artifacts

**Files:**
- Create: `docs/api/plugin-manifest.md`
- Create: `docs/api/plugin-bridge.md`
- Create: `docs/cost-analysis.md`
- Create: `docs/demo-script.md`
- Modify: `README.md`
- Modify: `docs/testing.md`

**Step 1: Write the docs outline**

Add:
- setup guide
- architecture overview
- plugin API docs
- auth flow docs
- deployed link placeholder
- cost table for 100 / 1K / 10K / 100K users

**Step 2: Fill cost analysis**

Include:
- actual dev token spend
- input/output token counts
- assumptions per app/tool
- monthly cost projections

**Step 3: Add demo script**

Demo sequence:
- start chess inline
- ask for move advice mid-game
- use weather plugin
- connect Spotify and create study playlist
- ask follow-up about plugin results

**Step 4: Run final gate**

Run:
- `pnpm lint`
- `pnpm check`
- `pnpm test`
- `pnpm test:integration`

**Step 5: Commit**

```bash
git add docs/api/plugin-manifest.md docs/api/plugin-bridge.md docs/cost-analysis.md docs/demo-script.md README.md docs/testing.md
git commit -m "docs: add submission and plugin api documentation"
```

---

## Fastest Ship Path

If deadline pressure spikes, do this exact order:

1. Task 1
2. Task 2
3. Task 3
4. Task 5
5. Task 4
6. Task 6
7. Task 7
8. Task 8
9. Task 10

Only start Task 9 if Tasks 1 through 8 are green.

---

## Swarm Assignment

- **Agent A:** Tasks 1 and 2
- **Agent B:** Tasks 3 and 4
- **Agent C:** Task 5
- **Agent D:** Task 6
- **Agent E:** Task 7
- **Agent F:** Task 8
- **Agent G:** Task 10
- **Agent H:** Task 9 only after broker contract stabilizes

Merge order:

1. A
2. B
3. C
4. D + E in parallel
5. F
6. G
7. H stretch

---

## Subagent Dispatch Packets

Use these as fresh-context packets. One packet per subagent. No freestyle scope expansion. If a packet hits blocked shared files outside its assignment, stop, write findings, hand back.

### Global rules for every subagent

- Use Node 20 or 22 only
- Before commands: `export PATH="/opt/homebrew/opt/node@20/bin:$PATH"`
- Do not touch unrelated files
- Prefer tests first for each assigned seam
- If a shared type or protocol must change, stop and hand back unless packet explicitly owns it
- Ship evidence, not claims: test output, file list, exact remaining gaps
- Commit style: conventional commits only

### Agent A — Platform contract owner

**Owns**
- `src/shared/plugin-types.ts`
- `src/shared/plugin-protocol.ts`
- `src/shared/plugin-protocol.test.ts`
- `src/renderer/stores/pluginRegistry.ts`
- `src/renderer/stores/pluginRegistry.test.ts`
- `src/renderer/plugins/index.ts`

**Mission**
- Keep manifest/protocol/store stable
- No UI work
- No auth work

**Deliverables**
- Stable plugin type contract
- Stable plugin registry API
- Tests green for protocol + registry

**Stop if**
- You need to change chat message rendering
- You need to change model streaming behavior

**Prompt**

```text
You are Agent A on ChatBridge. Own only the plugin contract and registry store. Keep changes inside the assigned files unless a test import forces a tiny adjacent edit. Do test-first. Do not touch UI rendering, auth, or session message formatting. Deliver: exact files changed, tests run, open contract risks.
```

### Agent B — Plugin host + mount path owner

**Owns**
- `src/renderer/components/PluginFrame.tsx`
- `src/renderer/components/PluginFrame.test.tsx`
- `src/renderer/components/PluginFrameInline.tsx`
- `src/renderer/hooks/usePluginChannel.ts`
- `src/renderer/hooks/usePluginChannel.test.ts`
- `src/renderer/components/chat/Message.tsx`
- message-part insertion helper wherever finally placed

**Mission**
- Guarantee plugin content part insertion
- Guarantee iframe renders inline
- Guarantee tool invoke/result bridge stays stable

**Deliverables**
- Inline mount path complete
- Focused component tests green
- One integration test proving plugin part renders after tool execution

**Stop if**
- You need to redesign plugin protocol
- You need to implement auth broker

**Prompt**

```text
You are Agent B on ChatBridge. Own the inline plugin host path end to end: assistant/plugin content part insertion, PluginFrame render, bridge event flow, and focused tests. Do not redesign protocol or auth. Goal: after plugin tool execution, a plugin iframe definitely mounts inline in chat and TOOL_RESULT resolves back cleanly.
```

### Agent C — Chess plugin owner

**Owns**
- `src/renderer/plugins/chess/manifest.ts`
- `src/renderer/plugins/chess/ui.html`
- `src/renderer/plugins/chess/index.ts`
- `src/renderer/lib/chess/engine.ts`
- `src/renderer/lib/chess/engine.test.ts`
- chess lifecycle integration tests

**Mission**
- Make chess the gold-path plugin
- Ensure state snapshots are rich enough for hints/follow-ups

**Deliverables**
- Chess plugin manifest correct
- Chess UI handles tool calls correctly
- Chess emits `STATE_UPDATE` and `COMPLETION`
- One integration test for `let's play chess` full lifecycle

**Stop if**
- You need to change generic registry contract
- You need to build auth

**Prompt**

```text
You are Agent C on ChatBridge. Own chess as the first complete plugin. Assume protocol and host exist. Make chess the demo-quality gold path: start game, move, hint/get_position, completion, state snapshot quality. Stay inside chess/plugin files and tests unless a tiny adapter edit is unavoidable.
```

### Agent D — Public app owner

**Owns**
- `src/renderer/plugins/weather/*`
- `src/main/plugins/weather.ts`
- weather integration tests
- `docs/adding-plugin.md`

**Mission**
- Ship the low-risk public external app
- Exercise external public category without auth

**Deliverables**
- Weather manifest
- Forecast tool(s)
- Inline widget
- Failure/loading states

**Stop if**
- You need auth/token handling
- You need protocol changes

**Prompt**

```text
You are Agent D on ChatBridge. Own the public external app path with Weather. Goal: a stable low-risk plugin that proves external public app registration, tool invocation, inline UI, and graceful API failure behavior. No auth work. No protocol redesign.
```

### Agent E — Auth broker owner

**Owns**
- `src/main/auth/*`
- `src/shared/types/plugin-auth.ts`
- `src/main/deeplinks.ts`
- `src/preload/index.ts`
- auth broker tests

**Mission**
- Build platform-owned auth only
- Widgets never receive raw refresh tokens

**Deliverables**
- PKCE broker
- token storage/refresh
- minimal IPC surface
- auth state model for plugins

**Stop if**
- You need to build plugin UI
- You need to redesign plugin mount/message rendering

**Prompt**

```text
You are Agent E on ChatBridge. Own the platform auth broker only. Implement PKCE flow, secure token persistence, refresh, and narrow IPC. Widgets must never receive raw refresh tokens. Do not build plugin UI except tiny auth-status adapters if strictly required.
```

### Agent F — Authenticated app owner

**Owns**
- `src/renderer/plugins/spotify/*`
- `src/main/plugins/spotify.ts`
- spotify integration tests

**Mission**
- Ship the first authenticated app on top of Agent E
- Prove auth request → connect → tool use → widget state

**Deliverables**
- Spotify manifest
- connect/disconnect states
- playlist/current playback tools
- integration coverage

**Stop if**
- Auth broker API is unstable
- Protocol changes are required

**Prompt**

```text
You are Agent F on ChatBridge. Own Spotify on top of an existing auth broker. Goal: prove authenticated plugin UX end to end with minimal scope: connect, search/create playlist, current playback, clear connected/disconnected/error states. No broker redesign.
```

### Agent G — Submission/docs owner

**Owns**
- `README.md`
- `docs/api/plugin-manifest.md`
- `docs/api/plugin-bridge.md`
- `docs/cost-analysis.md`
- `docs/demo-script.md`
- `docs/testing.md`

**Mission**
- Convert implementation into grading-ready deliverables

**Deliverables**
- setup guide
- architecture/API docs
- cost table and assumptions
- demo walkthrough

**Stop if**
- Feature behavior is still changing under you

**Prompt**

```text
You are Agent G on ChatBridge. Own only submission artifacts and developer docs. Write docs that match shipped behavior exactly. Do not invent features. If implementation is incomplete, document current behavior and explicit TODOs instead of guessing.
```

### Agent H — Stretch auth pattern owner

**Owns**
- `src/main/auth/providers/github.ts`
- `src/renderer/plugins/github/*`
- `src/main/plugins/github.ts`
- github device-flow tests

**Mission**
- Add second auth pattern only after A through G stabilize

**Deliverables**
- GitHub device flow plugin
- device code UX
- repo/issue tools

**Stop if**
- Any blocker remains on revised critical path steps 1 through 8

**Prompt**

```text
You are Agent H on ChatBridge. This is stretch only. Implement GitHub device-flow auth as a second auth pattern after the primary PKCE path is stable. If core path is still red, stop and hand back without coding.
```

---

## Subagent Execution Order

### Wave 1

- Agent A
- Agent B

**Gate before Wave 2**

- plugin protocol stable
- registry stable
- plugin content part insertion working
- PluginFrame bridge tests green

### Wave 2

- Agent C
- Agent D
- Agent E

**Gate before Wave 3**

- chess inline lifecycle works
- public plugin works
- auth broker works

### Wave 3

- Agent F
- Agent G

### Wave 4

- Agent H stretch only

---

## Review Checklist Between Subagents

- Did the agent stay inside owned files?
- Did shared contracts change unexpectedly?
- Did tests run under Node 20/22?
- Did any packet silently expand scope?
- Did the work create merge pressure on shared files?
- Did the agent report exact remaining gaps?

Reject or rework any packet that fails one of these.

---

## External Research Notes

- **Spotify**: official docs support Authorization Code with PKCE and refresh tokens; best fit for popup/browser auth in a desktop app.
- **GitHub**: official docs support Device Flow for headless/CLI-style auth; best fit for second distinct auth demo on desktop.
- **Google**: official desktop OAuth docs use PKCE and refresh tokens; valid fallback if Spotify scope review becomes annoying.
- **Open-Meteo**: public weather API with simple HTTP usage; ideal low-risk public external app.

---

## Blockers to Watch

- Node version mismatch on this machine currently blocks `pnpm test` under Node 24; project expects Node 20 to 22 via `package.json` and `.node-version`.
- Inline plugin rendering is the actual grading cliff; route-only chess is not enough.
- Auth must stay platform-owned; widgets must never hold raw refresh tokens.
- Keep broken plugin isolation strict: plugin error card, chat stays alive.

---

## Newly Identified Gaps (2026-04-01 review)

1. README not updated — still vanilla Chatbox, needs setup guide + architecture overview
2. No social post planned — required for final submission (X or LinkedIn, tag @GauntletAI)
3. Platform user auth — requirements list it as core feature, need to verify/document
4. Error recovery UX — need visible error cards for plugin failures
5. Multi-app switching — need test coverage for scenario #5
6. Ambiguous routing / refusal — testing scenarios #6 and #7 not addressed (low priority)

---

Plan complete and saved to `docs/plans/2026-04-01-chatbridge-finish-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
