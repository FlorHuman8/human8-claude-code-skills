---
name: insites-eco-figma-design
description: InSites.Eco overlay for Figma-to-Vue work. Use with figma-to-vue-quasar when implementing or updating Vue components from Figma in the InSites.Eco monorepo (MemberPortal, SquareUi, TempLibrary, Authenticate). Covers package paths, variables.scss locations, and Insites design tokens.
---

# InSites.Eco — Figma implementation overlay

**Prerequisite:** Follow **[figma-to-vue-quasar](../figma-to-vue-quasar/SKILL.md)** for the full Figma MCP workflow, Vue SFC pattern, styling rules, verification, and common mistakes.

This skill adds only **InSites.Eco–specific** paths, tokens, and conventions.

> Canonical copy for the team also lives at `InSites.Eco/.cursor/skills/insites-eco-figma-design/SKILL.md` in git.

## Monorepo layout

Vue workspace root: `InSites.Eco.Client.Vue/`

| Package | npm name | Component path |
|---------|----------|----------------|
| **MemberPortal** | (private app) | `MemberPortal/src/components/<feature-area>/<component-name>.vue` |
| **SquareUi** | `@insites/vue-square-ui` | `SquareUi/src/components/<feature-area>/<component-name>.vue` — export from `src/components/index.ts` |
| **TempLibrary** | `@insites/vue-ec-temp-library` | `TempLibrary/src/components/<feature-area>/<component-name>.vue` |
| **Authenticate** | (private app) | `Authenticate/src/components/<feature-area>/<component-name>.vue` |

Path aliases (MemberPortal): `@/*` → `MemberPortal/src/*`, `@ui/*` → `SquareUi/src/*`.

Optional throwaway prototypes: `MemberPortal/src/figma-test/` when the user wants an isolated comp.

## Step 3a — variables.scss per package

Open the **owning package's** `src/styles/variables.scss` (wired as `sassVariables` in that package's `vite.config` / Storybook).

| Owning package | Entry `variables.scss` | Shared baseline |
|----------------|------------------------|-----------------|
| **SquareUi** | `InSites.Eco.Client.Vue/SquareUi/src/styles/variables.scss` | Canonical shared overrides |
| **MemberPortal** (incl. `figma-test/`) | `MemberPortal/src/styles/variables.scss` | `@import '@ui/styles/variables'` → SquareUi |
| **TempLibrary** | `TempLibrary/src/styles/variables.scss` | `@import '@insites/vue-square-ui/styles/variables'` → SquareUi; may add vars below import |
| **Authenticate** | `Authenticate/src/styles/variables.scss` | Standalone Quasar vars — **do not** assume SquareUi import; read this file only |

**Workflow:**

1. Determine owning package from the target component path.
2. Read that package's `variables.scss`.
3. If it imports SquareUi, also read `SquareUi/src/styles/variables.scss`.
4. For utility classes: `InSites.Eco.Client.Vue/SquareUi/src/styles/utilities.scss` when the package uses `@ui` / square-ui.

**Insites token examples** (when present in variables): `$insites-green`, `$human8-dark-teal`, `$text-on-surface-high` (87%), `$text-on-surface-medium` (70%), `$text-on-surface-disabled` (38%), `$surface`, `$border-color`.

**Notes:**

- `$primary` may be overridden at runtime from Square branding.
- Unresolved `TODO(design-tokens)` before merge: promote to SquareUi tokens with design approval when shared.

## Step 2b — InSites component reuse

1. **SquareUi / existing InSites** — `search_design_system` (with `fileKey`) or codebase search.
2. **Quasar** — per base skill.
3. **New local SFC** — per base skill.

## Design token checklist (InSites additions)

When filling the base checklist, also map:

- UI: `$primary`, `$dark`, `$positive`, `$negative`, `$border-color`
- Text on surface: `$text-on-surface-high`, `$text-on-surface-medium`, `$text-on-surface-disabled`
- Surface: `$surface`

## Step 4b — Production scope

For production UI, follow `CLAUDE.md` in the service repo: platform constants/i18n, validation, typed emits/props, tests, Pinia patterns.

| Intent | Typical scope |
|--------|----------------|
| **Design validation** | Visual match, mock state, Storybook OK |
| **Production UI** | Full app integration per CLAUDE.md |

## Step 5 — InSites conventions

- Text bindings: mustache inside `<span>` (SquareUi / MemberPortal convention).
- Pinia example: `import { useSquareStore } from '@/store/square-store';` in MemberPortal.
- **Lint cwd:** usually `InSites.Eco.Client.Vue/MemberPortal/` (or the package that owns the file):

```bash
cd InSites.Eco.Client.Vue/MemberPortal
npx eslint "<path-to-files>" --fix
npx stylelint "<path-to-files>" --fix
```

For SquareUi-only changes, run lint from `SquareUi/` if that package has lint scripts configured.

## Common mistakes (InSites-specific)

| Mistake | Fix |
|---------|-----|
| Assuming Authenticate imports SquareUi variables | Read `Authenticate/src/styles/variables.scss` only |
| Skipping owning package overrides | Read MemberPortal/TempLibrary file even when SquareUi is imported |
| Adding SquareUi component without export | Export from `SquareUi/src/components/index.ts` |
| `TODO(design-tokens)` left on merge to shared UI | Resolve or add token to SquareUi with design approval |
