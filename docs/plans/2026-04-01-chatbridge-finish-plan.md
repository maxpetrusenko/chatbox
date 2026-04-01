# ChatBridge Finish Plan Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the assignment-complete ChatBridge layer on top of Chatbox: true plugin registration, inline embedded apps, completion signaling, context retention, 3 required apps, at least 1 production auth flow, and submission artifacts.

**Architecture:** Keep the current chat stack. Add a manifest-driven plugin host, a narrow postMessage bridge, a registry store, and a platform-owned auth broker. Convert chess from standalone route to the first real plugin, then add one public external app and one authenticated external app. Keep the route-based chess page as fallback/manual QA surface until the inline plugin path is stable.

**Tech Stack:** Electron, electron-vite, React, TanStack Router, Zustand, Mantine, Vitest, sandboxed iframes, postMessage, OAuth2 PKCE, optional device flow.

---

## Source of Truth

- `docs/requirements.md` — grading rubric, required features, auth rules, deliverables
- `docs/chatbridge-presearch.html` — chosen architecture: sandboxed iframe, manifest registry, platform-owned auth
- `docs/chatbridge-plugin-architecture.html` — concrete plugin contract, message protocol, file map
- `docs/plans/2026-03-30-chess-chat-stabilization-handoff.md` — current state, shipped chess v1, deferred generic plugin work

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

Plan complete and saved to `docs/plans/2026-04-01-chatbridge-finish-plan.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
