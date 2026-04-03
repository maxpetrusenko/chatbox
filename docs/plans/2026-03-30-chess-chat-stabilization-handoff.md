Human skim: `docs/plans/index.html#chess-handoff`
# Chess Chat Stabilization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unblock the renderer crash, stabilize the chess route, and implement a reliable v1 chat-to-chess handoff that does not require the user to manually pick the game after asking to play.

**Architecture:** Keep chess as a dedicated TanStack route for v1 rather than introducing a new global `SessionType`. Detect chess-launch intent before normal chat submission, redirect into `/chess`, and let the chess route own the board state plus its local assistant panel. Preserve a narrow scope: fix crashes and handoff first, defer a full generic embedded-app platform unless the assignment explicitly requires inline app panels inside the main chat transcript.

**Tech Stack:** Electron, electron-vite, React, TanStack Router, Mantine, Tabler Icons, chess.js, react-chessboard, Vitest.

---

## Current State / Handoff Notes

### Known broken behavior

1. **Renderer crash in sidebar**
   - Error seen in app log: `ReferenceError: IconChess is not defined`
   - Crash surface: `src/renderer/Sidebar.tsx`
   - Impact: whole renderer falls into the app error boundary before useful manual testing.

2. **Chat-to-game flow is not the required UX yet**
   - Required behavior from `doc/requirements.md:80`: user says "let's play chess" → board appears → user can ask for help mid-game.
   - Current implementation is a standalone chess page in `src/renderer/routes/chess/index.tsx` with its own local assistant panel.
   - Gap: user still has to navigate/select chess manually instead of the app appearing as part of the interaction flow.

3. **Prop leak warning in devtools**
   - Warning seen: React does not recognize the `sessionType` prop on a DOM element.
   - Most likely source: custom props passed through Mantine `Avatar` wrappers in `src/renderer/components/common/Avatar.tsx`.
   - Impact: noisy console, hides real issues, easy to regress.

4. **Prior router autogen pitfall**
   - Non-route files inside `src/renderer/routes/chess/` were previously treated as routes.
   - Helper/test files now live in `src/renderer/lib/chess/`.
   - Do **not** move helper or test files back into `src/renderer/routes/`.

5. **Dev boot fragility was improved already**
   - `electron.vite.config.ts` no longer hard-fails on port `1212` collisions.
   - `src/main/main.ts` now retries renderer load and shows a fallback page instead of hanging forever on splash.

### Relevant files to know before touching anything

- `src/renderer/Sidebar.tsx`
- `src/renderer/routes/index.tsx`
- `src/renderer/routes/chess/index.tsx`
- `src/renderer/lib/chess/engine.ts`
- `src/renderer/lib/chess/engine.test.ts`
- `src/renderer/components/common/Avatar.tsx`
- `doc/requirements.md`
- `src/renderer/routeTree.gen.ts` (generated; never hand-edit)

### Recommended scope boundary

**Ship now:**
- fix sidebar crash
- remove `sessionType` warning
- make "let's play chess" auto-open chess
- keep chess route stable

**Defer unless required by assignment:**
- a generic embedded third-party app platform
- iframe/widget manifest system
- multi-app orchestration and tool registration layer

---

### Task 1: Remove immediate renderer crashers

**Files:**
- Modify: `src/renderer/Sidebar.tsx`
- Modify: `src/renderer/components/common/Avatar.tsx`
- Verify: `src/renderer/routes/index.tsx`

**Step 1: Reproduce the sidebar crash**

Run:

```bash
./node_modules/.bin/electron-vite --logLevel info
```

Expected:
- app boots
- renderer logs show `ReferenceError: IconChess is not defined`
- crash originates from `Sidebar.tsx`

**Step 2: Fix the icon reference in the sidebar**

In `src/renderer/Sidebar.tsx`:
- search for any `IconChess` usage or stale icon variable
- replace it with a real imported icon from `@tabler/icons-react`
- safest option: reuse `IconDeviceGamepad2` for the parent Games nav and a currently imported/valid icon for the Chess child item
- if a chess-specific icon is desired, confirm the exact export name exists before using it

Implementation rule:
- no undefined icon identifiers in JSX
- no import/usage mismatch

**Step 3: Verify the sidebar renders**

Expected after reload:
- no `ErrorBoundary caught an error: ReferenceError: IconChess is not defined`
- sidebar opens normally
- clicking the Games section does not crash

**Step 4: Remove the `sessionType` DOM prop leak**

In `src/renderer/components/common/Avatar.tsx`:
- audit `SystemAvatar`, `UserAvatar`, and `AssistantAvatar`
- any custom prop that is not a real DOM/Mantine prop must be destructured before `...avatarProps`
- especially ensure `sessionType` is never forwarded to the underlying `Avatar`

Recommended pattern:

```tsx
export const SystemAvatar = ({ size = 'md', className, sessionType: _sessionType, ...avatarProps }) => {
  // use or ignore _sessionType, but do not forward it
}
```

If `sessionType` is not actually needed on a component:
- remove it from that component's prop type entirely

**Step 5: Verify warning removal**

Expected:
- no React warning about `sessionType` on a DOM element
- home route and session route render cleanly

**Step 6: Commit**

```bash
git add src/renderer/Sidebar.tsx src/renderer/components/common/Avatar.tsx
git commit -m "fix: unblock chess sidebar crash and strip invalid avatar props"
```

---

### Task 2: Keep the chess route stable

**Files:**
- Verify: `src/renderer/routes/chess/index.tsx`
- Verify: `src/renderer/lib/chess/engine.ts`
- Verify: `src/renderer/lib/chess/engine.test.ts`
- Generated: `src/renderer/routeTree.gen.ts`

**Step 1: Confirm route boundaries**

Rules:
- only route files live under `src/renderer/routes/chess/`
- chess helpers/tests stay in `src/renderer/lib/chess/`
- `src/renderer/routeTree.gen.ts` must only include `/chess/`, not helper/test routes

**Step 2: Re-run focused chess tests**

Run:

```bash
./node_modules/.bin/vitest run src/renderer/lib/chess/engine.test.ts
```

Expected:
- stalemate-status regression test passes
- move-history formatting test passes

**Step 3: Smoke test chess page manually**

Manual:
- open `/chess`
- make a move as white
- AI responds
- undo works
- reset works
- no stale move appears after reset/undo

**Step 4: Commit if changed**

```bash
git add src/renderer/routes/chess/index.tsx src/renderer/lib/chess/engine.ts src/renderer/lib/chess/engine.test.ts src/renderer/routeTree.gen.ts
git commit -m "fix: stabilize chess route boundaries and state flow"
```

---

### Task 3: Implement v1 chat-to-chess handoff

**Files:**
- Create: `src/renderer/lib/chess/intents.ts`
- Create: `src/renderer/lib/chess/intents.test.ts`
- Modify: `src/renderer/routes/index.tsx`
- Modify: `src/renderer/routes/chess/index.tsx`
- Optional: `src/renderer/Sidebar.tsx`

**Architecture choice for v1**

Use **route handoff**, not a new session type.

Why:
- current session model only has `chat` and `picture`
- changing global session typing is high blast radius
- the current chess UI already exists as a dedicated route with its own assistant panel
- this gets the required UX much faster: ask to play → chess opens automatically

**Step 1: Add a tiny intent helper**

Create `src/renderer/lib/chess/intents.ts` with a pure function such as:

```ts
export function isChessLaunchRequest(text: string): boolean {
  const normalized = text.trim().toLowerCase()
  return [
    'play chess',
    "let's play chess",
    'lets play chess',
    'start chess',
    'open chess',
    'chess game',
  ].some((phrase) => normalized.includes(phrase))
}
```

Keep it intentionally simple.
Do not add LLM inference here.

**Step 2: Write focused intent tests**

Create `src/renderer/lib/chess/intents.test.ts`.

Test cases:
- positive: `let's play chess`
- positive: `open chess`
- negative: `analyze this paragraph`
- negative: empty string

Run:

```bash
./node_modules/.bin/vitest run src/renderer/lib/chess/intents.test.ts
```

Expected:
- tests pass

**Step 3: Intercept chess launch before normal chat submit**

Modify `src/renderer/routes/index.tsx` inside `handleSubmit`.

Implementation shape:
- read plain text from `constructedMessage`
- if `isChessLaunchRequest(text)` is true:
  - do **not** create a normal chat session yet
  - navigate directly to `/chess`
  - pass initial context through search params or router state

Recommended router payload for v1:
- `to: '/chess'`
- search params or state:
  - `prompt`: original user text
  - `autostart`: `true`
  - `source`: `'home-chat'`

This keeps the flow deterministic and avoids pretending the main chat transcript is synchronized when it is not.

**Step 4: Teach the chess route to accept launch context**

Modify `src/renderer/routes/chess/index.tsx`.

Add route search validation, for example:
- `prompt?: string`
- `autostart?: boolean`
- `source?: string`

On first mount:
- if `autostart` is true and `prompt` exists:
  - seed `chatMessages` with the user prompt and a matching assistant response
  - ensure the game is in a fresh state
  - do not duplicate messages on re-render

**Step 5: Define exact expected UX**

Expected v1 behavior:
1. user lands on home chat
2. user types `let's play chess`
3. submit intercept triggers
4. app navigates to `/chess`
5. chess board is visible immediately
6. chess assistant panel shows:
   - the user's launch prompt
   - assistant kickoff copy, e.g. `Started a new game. You're white — make your opening move.`
7. user can move pieces and ask follow-up questions in the chess panel

**Step 6: Do not oversell v1**

Do **not** claim this is full spec compliance with `doc/requirements.md:82`.
It is a strong v1 handoff, not a generic embedded app platform.

What remains intentionally deferred:
- inline board inside the main transcript itself
- synchronized transcript between main chat and chess route
- generic app manifest/tool system

**Step 7: Commit**

```bash
git add src/renderer/lib/chess/intents.ts src/renderer/lib/chess/intents.test.ts src/renderer/routes/index.tsx src/renderer/routes/chess/index.tsx
git commit -m "feat: auto-launch chess from chat intent"
```

---

### Task 4: Optional phase 2 if assignment requires true in-chat app integration

**Files to inspect first:**
- `doc/requirements.md:82`
- `src/renderer/components/Artifact.tsx`
- `src/renderer/routes/index.tsx`
- `src/renderer/routes/session/$sessionId.tsx`
- `src/renderer/stores/chatStore.ts`
- `src/renderer/stores/sessionActions.ts` / `src/renderer/stores/sessionHelpers.ts`

**Decision checkpoint**

If the requirement is literal — board appears inline inside the main chat surface — the route-handoff solution is not enough.

Then build a separate plan for:
- generic app panel state
- per-session active app state
- mounted chess panel inside the chat layout
- bridge between app state and assistant context

Do not start phase 2 inside the same patch unless explicitly approved.

---

### Task 5: Verification and handoff checklist

**Files:**
- Verify touched files only

**Step 1: Focused tests**

Run:

```bash
./node_modules/.bin/vitest run src/renderer/lib/chess/engine.test.ts src/renderer/lib/chess/intents.test.ts
```

Expected:
- all chess-focused tests pass

**Step 2: Renderer boot smoke**

Run:

```bash
./node_modules/.bin/electron-vite --logLevel info
```

Expected:
- no sidebar crash
- no splash-only hang
- renderer dev server starts even if `1212` is occupied

**Step 3: Manual QA flow**

Manual checklist:
- sidebar renders without `IconChess` error
- no `sessionType` prop warning in devtools
- clicking `Chess` in sidebar opens `/chess`
- typing `let's play chess` from home chat auto-opens chess
- chess board accepts moves
- assistant panel responds to hint/evaluation questions
- reset/undo do not resurrect stale AI moves

**Step 4: Known non-blockers**

Ignore during this work unless they become causal:
- Sentry `ERR_BLOCKED_BY_CLIENT`
- Electron dev security warnings about `webSecurity` / CSP
- repo-wide unrelated TypeScript errors outside chess flow

**Step 5: Final commit grouping**

Recommended commit sequence:

```bash
git commit -m "fix: unblock chess sidebar crash and strip invalid avatar props"
git commit -m "feat: auto-launch chess from chat intent"
git commit -m "test: add chess intent regression coverage"
```

---

## Notes for the next engineer

- Start with the crash. Do not debug chat integration while the sidebar is still throwing.
- Keep helper logic pure and tested in `src/renderer/lib/chess/`.
- Do not hand-edit `src/renderer/routeTree.gen.ts`; regenerate by running the app.
- Prefer the smallest real UX win over a half-built platform abstraction.
- If product insists on fully inline app panels inside the main chat transcript, stop and write a new plan before changing session architecture.
