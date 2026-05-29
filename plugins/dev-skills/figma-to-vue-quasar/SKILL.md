---
name: figma-to-vue-quasar
description: Use when given a Figma URL or node ID and asked to implement, generate, or update a Vue 3 component to match a Figma design in any project that uses Vue 3 (Composition API), TypeScript, Quasar, and BEM SCSS. Match Figma layout, type, and spacing in SCSS unless a Quasar utility exactly equals the spec. For repo-specific paths and token files, also load the project overlay skill (e.g. insites-eco-figma-design).
---

# Figma to Vue (Quasar)

## Overview

Use Figma MCP tools to extract design specs, then implement as a Vue 3 SFC (Quasar + TypeScript + SCSS). **Visual fidelity comes from Figma specs in SCSS**; Quasar utilities are optional shortcuts only when they match those specs exactly.

If the project documents Quasar `sassVariables` overrides (e.g. `src/styles/variables.scss`), use that file as the source of truth for tokens and utility verification. **Context7 is for Quasar component API only.**

Load a **project overlay skill** when one exists for paths, package layout, and org-specific tokens.

## Step 1 — Parse the Figma URL

From `figma.com/design/:fileKey/:name?node-id=:nodeId`:

- `fileKey`: path segment after `/design/`
- `nodeId`: **convert `-` to `:`** in the `node-id` query param (e.g. `1-234` → `1:234`)

## Step 2 — Extract Design Specs

Call these tools in order, **before writing any code**:

1. `get_metadata` — layer structure, component name
2. `get_design_context` — exact values: colors, typography, spacing, dimensions, borders, shadows
3. `get_variable_defs` — Figma design tokens → map to project SCSS vars where they exist
4. `search_design_system` — check if an existing design-system or shared UI component covers this pattern (**requires `fileKey`** from the parsed URL)
5. `get_screenshot` — visual reference to compare against after implementation

### Step 2b — Choose components (reuse, Quasar, or new)

Apply in this order:

1. **Existing shared / design-system components** — from `search_design_system` or codebase search when already used for the same pattern.
2. **Quasar primitives** — use when they match the design intent, **even if the repo has no prior usage** (e.g. `q-stepper`, `q-separator`, `q-expansion-item`, `q-banner`). Compare visually to the Figma screenshot; customize with props and slots before abandoning for a one-off custom widget.
3. **New local SFC(s)** — allowed when they match Figma and improve clarity: repeated blocks (date/time row, wizard section), or when no Quasar component fits without excessive overrides. Keep prototypes in one file until duplication hurts; split on promotion.

**Do not** skip Quasar components solely because they are unused elsewhere. **Do not** hand-roll a custom control when a Quasar component matches after props/slots.

Note the choice briefly (comment or PR) when picking Quasar vs custom. Use a Quasar component when the **screenshot and structure** match; use a local SFC when the design is a different layout pattern (e.g. nav beside content vs an all-in-one stepper) — document why.

### Design Token Checklist (fill before writing any code)

- [ ] Colors — fill, stroke, text → map to project `variables.scss` (or equivalent) where applicable; common Quasar overrides include `$primary`, `$dark`, `$positive`, `$negative`, `$border-color`
- [ ] **Token drift** — Prefer project SCSS vars when they match Figma (from the project's variables file, not quasar.dev defaults). If no suitable token exists, a literal hex/rgba is allowed.
- [ ] **TODO for unmatched colors (required)** — Every literal color (or local SCSS alias used only because tokens don't match) must have an adjacent comment, e.g.:
  ```scss
  // TODO(design-tokens): Figma #004750 — no matching $primary; map to design system when promoting
  $local-btn-bg: #004750;
  ```
  One TODO per distinct unmatched value is enough; group related literals in one comment if they share the same gap.
- [ ] **Production** — Resolve `TODO(design-tokens)` before merge: use shared tokens or add tokens to the shared UI package with design approval.
- [ ] Typography — set font-size, weight, and line-height in BEM SCSS from Figma (or `map.get($body1, size)` etc. when values match **project** `$body1` / `$caption` in variables.scss). Use Quasar `text-*` utilities **only after verifying** they equal the Figma spec — they are not the default
- [ ] Spacing — padding, gap, margin per container (Figma px = CSS px)
- [ ] Dimensions — width, height, min/max; `fill` = 100%, fixed = px value
- [ ] Border radius — use project default (often `$border-radius: 4px`); only deviate if Figma shows a different value
- [ ] Shadows — `box-shadow: {offset-x} {offset-y} {blur} {spread} {color+opacity}`
- [ ] Borders — width, style, color
- [ ] Opacity — layer-level opacity if < 100%

## Step 3 — Project variables, then Quasar API

After Step 2b picks Quasar components: read **project variables** for styling tokens (per project overlay or discover `sassVariables` in vite config), then use **Context7** only for component API.

### Step 3a — Project Quasar variables (before Context7 for styling)

**Read first** when mapping tokens, SCSS, or verifying whether a Quasar utility matches Figma.

**Rule:** Open the **owning app's** Quasar variables file — typically `src/styles/variables.scss` wired as `sassVariables` in `vite.config` / Storybook. Follow `@import` / `@use` to a shared UI package when present; read any app-specific lines below the import.

**Workflow:**

1. From the target component path, determine the owning app or package.
2. Read that package's variables file (project overlay lists paths when available).
3. If it imports a shared UI library, also read that library's variables for typography, palette, breakpoints.
4. For custom utility classes, check the shared UI package's utilities SCSS when the project uses one.

**Notes:**

- Brand colors like `$primary` may be overridden at runtime in some apps.
- Figma ≠ project var → BEM SCSS + `TODO(design-tokens)`; do not trust generic Quasar docs for px or colors.
- Spacing vars may not all live in `variables.scss` — use Figma px + DevTools when verifying `q-pa-*`.

Do **not** assume every app shares one variables file; do **not** skip the owning app's file when it adds overrides on top of a shared library.

### Step 3b — Context7 / quasar.dev (API only)

Use the **Context7** MCP server when enabled:

1. **`resolve-library-id`** — query `"quasar"` → library ID for Quasar v2 (e.g. v2.18.x).
2. **`query-docs`** — pass that ID and `topic` = component or feature (e.g. `"QStepper"`, `"QField"`).

Read each tool's MCP schema before calling.

**When to call:** Uncertain of prop, event, or slot names — including new-to-repo components (`q-stepper`, `q-field`, etc.).

**Skip if:** Trivial usage (e.g. `q-icon` with `name`), or you already fetched the same topic this session.

**Do not use Context7 / quasar.dev for:** `text-*` / `q-pa-*` px, palette (`grey-7`), breakpoints, or whether utilities match Figma — use Step 3a + the checklist (+ DevTools if needed).

**If Context7 is not available:** [Quasar Vue Components](https://quasar.dev/vue-components) for API only; do not guess prop names or default token values.

## Step 4 — Determine Flow

**Create new:** Place components per project overlay (default pattern: `src/components/<feature-area>/<component-name>.vue`). Add `<component-name>.types.ts` only if props are shared across components.

**Update existing:**

1. Read the current file first
2. Diff against Figma specs token-by-token
3. Change only what diverges — never restructure working logic

### Step 4b — Confirm scope

Ask or infer from the user request:

| Intent | Typical scope |
|--------|----------------|
| **Design validation** | Visual match, local/mock state, Storybook OK, no API/i18n/routes unless asked |
| **Production UI** | Platform constants/i18n, validation, typed emits/props, tests per project docs |

- State briefly what is in/out of scope (comment or PR note).
- Prototypes may use Figma-exact literals where tokens differ — **never silently** substitute; use `TODO(design-tokens)` (Step 2).
- If Figma copy has obvious typos, ask: match design vs correct English.

## Step 5 — Vue 3 SFC Pattern

```vue
<script setup lang="ts">
// Import only what you use: computed, ref, watch, onMounted
import { computed } from 'vue';

withDefaults(
  defineProps<{
    title: string;
    isActive?: boolean;
  }>(),
  {
    isActive: false,
  },
);

const emit = defineEmits<(e: 'close') => void>();
</script>

<template>
  <div class="component-name column">
    <!-- Quasar for controls/structure: q-card, q-btn, q-input, q-select, q-icon, q-separator -->
    <!-- Figma padding/gaps/type/widths: BEM SCSS (see Step 5c), not approximate q-pa-* / text-* -->
    <!-- Structural flex only when it does not set px: row, column, items-center, no-wrap -->
    <!-- NOT plain HTML <button>, <img>, <article> — use Quasar equivalents -->
  </div>
</template>

<style lang="scss">
/* ALWAYS lang="scss" — never plain <style> or scoped */
/* Figma-exact layout, spacing, typography in BEM blocks (see Step 5c) */
/* Use project SCSS vars — NOT var(--color-primary) */
.component-name {
  &__section {
    // gap: <px>;
  }

  &__field {
    .q-field__control {
      // min-height, border: one shared block per field style on this screen
    }
  }
}
</style>
```

### Step 5c — Figma-first styling; selective Quasar helpers

**Default:** Implement padding, gap, margin, width, font-size, line-height, border-radius, and colors in **component BEM SCSS** using values from the Step 2 checklist. Quasar is for **components and behavior**, not approximate styling.

**Priority (highest first):**

1. **Figma-exact values** in BEM SCSS (px from `get_design_context` / checklist).
2. **Project SCSS variables** from the owning package's variables file (Step 3a) when they match Figma.
3. **Quasar components** (`q-card`, `q-input`, `q-select`, `q-btn`, `q-checkbox`, `q-icon`, …).
4. **Quasar / project utility classes** only when the **computed value equals** the Figma spec for that node (verify against project `variables.scss` + checklist; DevTools if spacing is not in the file). If unsure, use SCSS.

**When utilities are a good fit:** Figma px matches what the utility resolves to in **this repo** (confirmed via variables file + checklist). Then `q-pa-md`, `q-gutter-md`, or `col-*` on a true 12-column layout are fine.

**Safe on template (no px substitution):**

| OK without per-node Figma check | Examples |
| ------------------------------- | -------- |
| Structural flex | `row`, `column`, `items-center`, `items-start`, `justify-between`, `no-wrap`, `flex-center` |
| Quasar structure | `q-card`, `q-separator`, `q-btn` (`flat`, `unelevated`, `no-caps`) |
| Field behavior props | `stack-label`, `borderless`, `dense`, `hide-bottom-space` — label/icon **colors** still from checklist if palette props do not match |

**Do not use as Figma stand-ins:**

- `text-h*`, `text-body*`, `text-caption`, `text-subtitle*`, `text-weight-*` when the checklist lists different px / line-height / weight
- `text-grey-*`, `bg-grey-*` when Figma gives a specific hex or token — use project token, BEM color, or literal + `TODO(design-tokens)`
- `q-pa-*`, `q-gutter-*`, `q-col-gutter-*` when you have not verified they match that frame's padding/gap
- `col`, `col-*` when Figma shows **fixed px widths** or asymmetric columns — use `max-width`, `flex`, or `grid` with values from `get_design_context`

**Keep in SCSS (typical):**

- Padding, gap, margin, and max-width per container from the checklist
- Typography that does not match a Quasar `text-*` class exactly
- Shared blocks for repeated chrome (e.g. one `&__field` for all standard underline inputs on the screen)
- Custom widgets when no Quasar component matches after screenshot compare
- `@use 'sass:map'` + `map.get()` when referencing `$body2`, `$text-weights`, etc. (Stylelint)

**Avoid:** Deep `.q-field__*` duplication per field; picking utilities to avoid SCSS when the checklist value is non-standard for the design system.

Match class patterns from sibling components in the same app area when they already match Figma.

### Step 5b — Quality habits

**HTML**

- Use the right element for the pattern (headings, `nav`, grouped fields) — follow the HTML spec, not only ESLint.
- **Do not break HTML to satisfy a linter** (e.g. wrapping `legend` in a `div` to fix `label-has-for`). Fix structure: `fieldset`/`legend`, or proper `for` + `id`.
- Follow the project's text-in-`<span>` convention inside headings, labels, and buttons when documented.

**Accessibility**

- Current step/tab/page: expose state (`aria-current`, `aria-selected`, etc.) where the pattern applies.
- Custom/interactive widgets (popups, readonly triggers): keyboard + appropriate ARIA — not click-only.
- Icons that imply help or action: provide content (tooltip/dialog) or treat as decorative.
- Control affordance should match behavior.

**Logic**

- Formatters/parsers (dates, numbers): validate before display; use safe fallbacks.
- Repeated UI blocks: extract a subcomponent when duplication hurts readability.

## Step 6 — Verify

1. Call `get_screenshot` again and compare side-by-side with the implementation
2. Walk the token checklist — confirm every value is represented; every unmatched literal has `TODO(design-tokens)`
3. **Utility audit** — for each `text-*`, `q-pa-*`, `q-gutter-*`, `col-*` on the template, confirm it equals the Figma spec using the owning package's `variables.scss` (not stock Quasar docs), or remove it in favor of BEM SCSS
4. Check responsive breakpoints visible in design (`$q.screen.lt.md`, `$q.screen.gt.sm`) against project `$breakpoint-*` in variables.scss when relevant
5. **Lint** — from the package that owns the component:

```bash
npx eslint "<path-to-new-files>" --fix
npx stylelint "<path-to-new-files>" --fix
# Re-run without --fix until clean
```

Prototypes are **not** exempt from lint on touched files. Prefer `--fix` first; fix remaining issues by correcting HTML/SCSS structure, not disabling rules.

**Promoting to production:** Re-scope per project docs (constants/i18n, validation, typed API surface, tests, resolve `TODO(design-tokens)` and temporary styles).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Node ID kept as `1-234` | Convert `-` to `:` → `1:234` |
| `var(--color-primary)` | Use `$primary` SCSS variable instead |
| Adding `scoped` to styles | Use `<style lang="scss">` — never `scoped` |
| Using `<article>`, `<img>`, `<button>` | Use `q-card`, `q-img`, `q-btn` |
| Hardcoding hex without checking tokens | Map via `get_variable_defs`; if no match, literal + `TODO(design-tokens)` |
| Literal color with no matching token | Use SCSS var if it fits; else literal + `TODO(design-tokens)` |
| Scope creep in a design task | Confirm prototype vs production up front |
| Invalid HTML for accessibility lint | Valid structure first; do not disable rules |
| `search_design_system` missing `fileKey` | Pass `fileKey` from parsed URL |
| Marking done without linters | Run ESLint + Stylelint on changed files |
| Monolithic SFC with copy-pasted sections | Extract shared subcomponent |
| Skipping `search_design_system` | An existing component may already match |
| Skipping token checklist | Extract ALL tokens before writing a single line |
| Restructuring logic in update flow | Only change what the diff shows |
| Guessing Quasar prop/event names | Use Context7 `query-docs` (or quasar.dev) for API only before coding |
| Context7 / quasar.dev for `text-body1` or `q-pa-*` px | Read owning package `variables.scss`; compare to Figma checklist |
| Context7 MCP disabled / missing | Use official Quasar docs for API; do not invent props or default token values |
| Skipping Quasar because repo never used it | Use matching `q-*` when design fits (Step 2b) |
| `text-*` when checklist px ≠ Quasar class | Set typography in BEM SCSS from checklist |
| `q-gutter-*` / `col-*` without verifying px | Use checklist values; utilities only when verified |
| Utilities to avoid SCSS for non-standard specs | Use SCSS for any value that does not match design system scale |
| Per-field `.q-field__control` copy-paste | One shared field class + `stack-label` / `borderless`; colors in SCSS |
| Forcing `q-stepper` when layout differs | Pick component from screenshot; document custom nav if needed |
| Using both default props + `#header` slot on `q-expansion-item` | `#header` slot overrides defaults — use one or the other |
