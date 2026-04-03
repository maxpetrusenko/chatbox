Human skim: `docs/reference-index.html#testing`
# ChatBridge Submission Checklist

## Product requirements

- [x] Inline embedded plugin host
- [x] Plugin manifest registry
- [x] PostMessage bridge with nonce checks
- [x] Completion signaling
- [x] Plugin state retention into later prompts
- [x] Chess plugin
- [x] Public external plugin: Weather Lab
- [x] Authenticated plugin: Spotify Study DJ
- [x] Second auth pattern stretch: GitHub Repo Coach

## Auth requirements

- [x] Platform-owned PKCE flow
- [x] Platform-owned device flow
- [x] Encrypted refresh token storage in main process
- [x] Deep link callback handling
- [x] Short-lived access token delivery to widgets only

## Docs

- [x] Plugin API doc: `docs/plugin-api.md`
- [x] Cost analysis: `docs/cost-analysis.md`
- [x] Finish plan: `docs/plans/2026-04-01-chatbridge-finish-plan.md`

## Still manual

- [ ] Demo video
- [ ] Final deployed artifact / packaged desktop build
- [ ] Final rubric walkthrough against running app
- [ ] Social post (X or LinkedIn, tag @GauntletAI)
- [ ] README update with setup guide + architecture overview
- [ ] Platform user auth verification/documentation
