# ChatBridge Plugin API
Human skim: `docs/plugin-api.html`

## Overview

ChatBridge plugins are manifest-driven embedded apps. Each plugin provides:

- a manifest with tool definitions
- a sandboxed iframe entrypoint
- postMessage handlers for state, completion, tool results, and auth
- optional host-owned app auth such as `chatbox-ai-login` or `k12-login`
- optional proxy config and K12 governance metadata

Builtin examples in this repo:

- `chess` — internal app
- `weather` — public external app
- `spotify` — OAuth PKCE app
- `github` — device flow app
- `geogebra` — education surface
- `phet` — education simulation surface
- `google-maps` — public utility surface
- `wolfram` — district-key-compatible utility surface

## Manifest shape

See `src/shared/plugin-types.ts`.

Required fields:

- `id`
- `name`
- `version`
- `description`
- `category`
- `tools`
- `widget.entrypoint`

Auth-capable plugins add:

- `auth.type`
- `auth.clientId`
- endpoint URLs
- scopes

Current manifest surface also includes:

- `appAuth`
- `proxy`
- `trustLevel`
- `dataProfile`
- `coppaScope`
- `dpaRequired`
- `targetGrades`
- `contentSafetyLevel`
- `allowedDomains`
- `signatureType`

## Host to plugin messages

See `src/shared/plugin-protocol.ts`.

- `PLUGIN_INIT` — initial nonce, instance id, config
- `TOOL_INVOKE` — tool name, call id, parameters
- `AUTH_STATUS` — auth state, optional short-lived access token, optional metadata

## Plugin to host messages

- `PLUGIN_READY` — handshake start
- `STATE_UPDATE` — latest serializable widget state
- `TOOL_RESULT` — result or error for a tool call
- `COMPLETION` — structured finish signal
- `AUTH_REQUEST` — ask host to start auth
- `ERROR` — plugin-level error

## Auth model

The platform owns auth.

- PKCE and device flow start in the host
- refresh tokens stay in main-process encrypted storage
- widgets only receive short-lived access tokens
- auth callbacks return through `chatbox://plugin-auth/callback`
- app-auth gates can require Chatbox AI sign-in or K12 sign-in before tools are exposed

## Runtime gating

A plugin being installed does not mean it is visible or callable.

- tool exposure is gated by `shouldEnablePluginTools(...)`
- active inline app state can suppress generic tool injection
- hidden builtin state can remove builtin manifests from the visible set
- K12 scope and current role still filter visible manifests
- student access can still be blocked by missing plugin auth sessions

## Builtin app examples

### Chess

- tools: `start_game`, `apply_move`, `get_position`, `finish_game`
- rich state snapshots feed later prompts

### Weather Lab

- tools: `lookup_forecast`, `lookup_air_quality`, `finish`
- uses Open-Meteo public APIs

### Spotify Study DJ

- tools: `search_playlists`, `create_study_playlist`, `get_current_playback`, `finish`
- requires `SPOTIFY_CLIENT_ID`
- auth: Authorization Code + PKCE

### GitHub Repo Coach

- tools: `get_profile`, `list_my_repos`, `finish`
- requires `GITHUB_CLIENT_ID`
- auth: device flow

### Education and utility examples

- `geogebra`
- `phet`
- `google-maps`
- `wolfram`

## Adding a new plugin

1. Add `manifest.ts`
2. Add `ui.html`
3. Add `index.ts` to register manifest + html
4. Add the plugin to `src/renderer/plugins/index.ts`
5. If auth is required, fill `auth` in the manifest
6. Emit `STATE_UPDATE` and `COMPLETION` with compact JSON state
