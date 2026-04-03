Human skim: `docs/reference-index.html#ops`
# Coolify Deploy

This repository can be deployed to Coolify from GitHub as a static web build.

## Target

- Host: Hapi / Coolify
- Source: GitHub repository
- Runtime: Dockerfile build
- App type: static web build served by Caddy

## Files

- `Dockerfile` builds the web app with `pnpm build:web`
- `deploy/Caddyfile` serves the generated SPA with history fallback
- `.dockerignore` keeps the build context lean

## Coolify Setup

1. Push this repository to GitHub.
2. In Coolify, create a new application from GitHub.
3. Point it at this repository and branch.
4. Use the root `Dockerfile`.
5. Expose port `8080`.
6. Add your domain in Coolify.

## Notes

- This deploy path serves the web build, not the Electron desktop app.
- Client IDs such as `SPOTIFY_CLIENT_ID` can be passed as build variables if you want them baked into the web build.
- Secrets such as user API keys should not be baked into a public web deploy.

## Local Verify

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
pnpm build:web
docker build -t chatbox-web .
docker run --rm -p 8080:8080 chatbox-web
```
