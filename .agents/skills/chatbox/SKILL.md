```markdown
# chatbox Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill teaches you the core development patterns, coding conventions, and common workflows used in the `chatbox` repository—a TypeScript React application. You'll learn how to add plugins, implement features with tests and types, update translations, manage releases, maintain documentation, and update AI model definitions. This guide also covers code style, commit patterns, and testing practices to help you contribute effectively.

## Coding Conventions

- **File Naming:** Use `camelCase` for file names.
  - Example: `pluginProtocol.ts`, `tokenEstimation.ts`
- **Import Style:** Use relative imports.
  - Example:
    ```ts
    import pluginProtocol from './pluginProtocol'
    ```
- **Export Style:** Use default exports.
  - Example:
    ```ts
    export default function TokenEstimation() { ... }
    ```
- **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/) with prefixes like `fix`, `feat`, `chore`, `refactor`.
  - Example: `feat: add token estimation for plugins`
- **Test Files:** Use `.test.ts` suffix.
  - Example: `pluginProtocol.test.ts`

## Workflows

### Add Plugin
**Trigger:** When you want to add a new plugin (e.g., weather, chess, spotify, github) to the app  
**Command:** `/add-plugin`

1. Create or update `src/renderer/plugins/<plugin>/manifest.ts`
2. Create or update `src/renderer/plugins/<plugin>/index.ts`
3. Create or update `src/renderer/plugins/<plugin>/ui.html`
4. Update `src/renderer/plugins/index.ts` to register the new plugin
5. Optionally update `src/renderer/routes/__root.tsx` to auto-init or QA the plugin

**Example:**
```ts
// src/renderer/plugins/weather/manifest.ts
export default {
  name: "Weather",
  description: "Provides weather updates."
}
```
```ts
// src/renderer/plugins/index.ts
import weather from './weather'
export default [weather /*, ...other plugins */]
```

---

### Feature with Tests and Types
**Trigger:** When adding a new core feature or protocol  
**Command:** `/new-feature-module`

1. Create or update implementation files (e.g., `src/shared/plugin-protocol.ts`)
2. Add or update corresponding test files (`*.test.ts`)
3. Add or update type definitions (e.g., `src/shared/plugin-types.ts`)
4. Update related stores or hooks as needed

**Example:**
```ts
// src/shared/plugin-protocol.ts
export default function handlePluginProtocol() { ... }

// src/shared/plugin-protocol.test.ts
import handlePluginProtocol from './plugin-protocol'
import { describe, it, expect } from 'vitest'

describe('handlePluginProtocol', () => {
  it('should ...', () => {
    expect(handlePluginProtocol()).toBe(/* ... */)
  })
})
```

---

### i18n Update
**Trigger:** When adding or updating translations for features, errors, or UI  
**Command:** `/update-i18n`

1. Edit `src/renderer/i18n/locales/*/translation.json` files
2. Optionally update UI components to use new translation keys

**Example:**
```json
// src/renderer/i18n/locales/en/translation.json
{
  "welcome": "Welcome to Chatbox",
  "plugin_added": "Plugin added successfully"
}
```

---

### Release Changelog Update
**Trigger:** When preparing a new release  
**Command:** `/release`

1. Update `release/app/package.json` with the new version
2. Update `src/renderer/i18n/changelogs/changelog_en.ts` and `changelog_zh_Hans.ts`

**Example:**
```json
// release/app/package.json
{
  "version": "1.2.3"
}
```
```ts
// src/renderer/i18n/changelogs/changelog_en.ts
export default [
  { version: "1.2.3", changes: ["Added new plugin system"] }
]
```

---

### Docs Bundle Update
**Trigger:** When updating or adding documentation  
**Command:** `/update-docs`

1. Edit or add files in `docs/` or `doc/` directories
2. Edit `README.md` or `.env.example` as needed

**Example:**
```md
# New Feature
This document explains the new plugin protocol...
```

---

### Model Definition Update
**Trigger:** When adding or updating AI model definitions  
**Command:** `/update-models`

1. Edit `src/shared/providers/definitions/models/*.ts` and/or `src/shared/providers/definitions/gemini.ts`
2. Edit `src/renderer/components/ImageModelSelect.tsx`
3. Edit `src/renderer/routes/image-creator/-components/constants.ts`

**Example:**
```ts
// src/shared/providers/definitions/models/gpt4.ts
export default {
  id: "gpt-4",
  name: "GPT-4",
  type: "text"
}
```

## Testing Patterns

- **Framework:** [Vitest](https://vitest.dev/)
- **Test File Pattern:** Use `*.test.ts` for test files.
- **Example:**
  ```ts
  // src/shared/tokenEstimation.test.ts
  import estimateTokens from './tokenEstimation'
  import { describe, it, expect } from 'vitest'

  describe('estimateTokens', () => {
    it('returns correct token count', () => {
      expect(estimateTokens('hello')).toBe(1)
    })
  })
  ```

## Commands

| Command           | Purpose                                                      |
|-------------------|--------------------------------------------------------------|
| /add-plugin       | Add a new plugin to the platform                             |
| /new-feature-module | Implement a new feature/module with tests and types         |
| /update-i18n      | Update translation files and related UI                      |
| /release          | Prepare a new release and update changelogs                  |
| /update-docs      | Add or update documentation                                  |
| /update-models    | Add or update AI model definitions and related constants     |
```