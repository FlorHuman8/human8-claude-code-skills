---
name: insites-angular-to-vue-migration
description: >
  Use when converting, porting, migrating, or rewriting AngularJS code in the InSites.Eco project to Vue 3. Triggers on Angular patterns: vm., $inject, $onInit, controllerAs, ui-router states, isc-ui components, Angular Material directives, ng-transclude, translate filter, FormController, $filter. Also triggers when the user provides Angular source file paths (.controller.ts, .component.ts, .html) and asks for Vue 3 equivalents. Do NOT use for generic Vue questions, backend work, Angular-only debugging, or CI/CD.
---

# InSites Angular → Vue Migration Guide

This skill helps you migrate AngularJS (1.8.2) code from the InSites.Eco project to Vue 3 + Quasar 2. Use it whenever the user needs Angular code converted to follow the existing patterns in `InSites.Eco.Client.Vue`.

## When This Skill Applies

Trigger when the user asks to:
- Migrate, convert, port, or rewrite AngularJS code to Vue 3
- Transform Angular controllers/components/services/routes to Vue equivalents
- Map Angular Material or `isc-ui` to `@ui` SquareUi components first, then Quasar when no match
- Generate Jest unit tests for newly migrated Vue code
- Add Vue Router routes from UI-Router state definitions

## Before You Start

`SKILL.md` is always in context when this skill triggers. Do **not** load all reference files up front (~1,700 lines / ~16–23k tokens). Read only what the migration needs.

**Always read:** the matching file from `references/vue-templates/` (`Component.vue`, `Component.spec.ts`, etc.).

**Read on demand:**

| Migration task | Reference file(s) |
|----------------|-------------------|
| Page / component | `component-patterns.md`, `i18n-patterns.md`; add `form-validation-patterns.md` if the source has forms; add `common-pitfalls.md` §1 only if styles touch layout/flex |
| HTTP / Angular dataservice | `service-patterns.md` |
| Shared / cached state | `pinia-patterns.md` |
| UI-Router state | `routing-patterns.md` |
| `isc-ui` or Angular Material in template | Search `@ui` first (see Step 3a); then `quasar-mappings.md` for Quasar fallbacks |
| Unit tests | `testing-patterns.md` |
| Obscure Angular API not covered here | `angular-to-vue-mappings.md` |

Use the Angular source paths from the user prompt. Mirror naming and style of sibling Vue files in the same feature folder when they exist.

Use context7 MCP only when `@ui` has no match and you need Quasar API details (e.g. `q-stepper` props).

## Migration Workflow

When processing a migration request, follow these steps in order:

### Step 1: Analyze the source

Read all the AngularJS files provided by the user. These will include one or more of:
- `.component.ts` — Component registration with bindings
- `.controller.ts` — Controller class with `$inject`, `$onInit`, methods
- `.html` — Template with `vm.`, Angular directives, `isc-ui` components
- `.scss` — Styles
- `.service.ts` — Service class with `$inject`

Extract:
- What bindings (inputs) the component expects
- What services are injected and how they're used
- Lifecycle logic (`$onInit`, `$onDestroy`, `$onChanges`)
- Template structure, Angular directives, Angular Material/isc-ui components
- UI-Router state dependencies (`$stateParams`, `$state`, `$location`)
- RxJS subscriptions (`.subscribe()`)
- Shared state that might need a Pinia store

### Step 2: Determine the migration target type

- **Page/Component** → `.vue` file with `<script setup lang="ts">`
- **Service** → Plain TS module (exported functions) OR Pinia store
- **UI-Router state** → Vue Router route config + route name enum entry

### Step 3: Generate migrated file(s)

#### 3a: Generate the Vue Component

Follow these exact rules:

- **File name**: kebab-case `.vue` (e.g., `activity-config-page.vue`). Do not use PascalCase filenames.
- **Script**: `<script setup lang="ts">` exclusively. No Options API.
- **UI components** — resolution order:
  1. Search `InSites.Eco.Client.Vue/SquareUi/src/components/index.ts` for an existing `Isc*` Vue component (e.g. `isc-email` → `IscEmail` from `@ui/components`).
  2. Import from `@ui/components` or `@ui/components/<path>/isc-*.vue`.
  3. Only if no `@ui` match: use Quasar `q-*` per `references/quasar-mappings.md`.
  4. If neither fits: follow Step 4.
- **Styles**: `<style lang="scss">` without `scoped` — never use `<style scoped>` or the `scoped` attribute. BEM class naming for isolation.

Convert Angular patterns:

| Angular Pattern | Vue Pattern |
|---|---|
| `controllerAs: 'vm'` → all template vars use `vm.` | Direct variable access in `<script setup>` — no prefix needed |
| `static $inject = [...]` with constructor params | Direct `import` of functions/stores |
| `$onInit()` | `onMounted()` or `onBeforeMount()` for async init |
| `$onDestroy()` | `onBeforeUnmount()` |
| `$q.all([promise1, promise2])` | `Promise.all([promise1, promise2])` |
| `this.someProperty` | `ref(value)` or `reactive({})` |
| `this.someMethod = () => ...` | top-level `function someMethod()` or `const someMethod = () => ...` |
| `ng-if` | `v-if` |
| `ng-show` / `ng-hide` | `v-show` |
| `ng-click="vm.doSomething(param)"` | `@click="doSomething(param)"` |
| `ng-class="{ active: vm.isActive }"` | `:class="{ active: isActive }"` |
| `ng-repeat="item in vm.items"` | `v-for="item in items"` |
| `ng-model="vm.value"` | `v-model="value"` |
| `ng-bind="vm.text"` | `{{ text }}` |
| `ng-bind-html="vm.html"` | `v-html="html"` |
| `ng-disabled="vm.isDisabled"` | `:disabled="isDisabled"` |
| `ng-change="vm.onChange()"` | `@change="onChange"` |
| `ng-submit="vm.submit()"` | `@submit.prevent="submit"` |
| `{{ 'LabelKey' \| translate }}` | `getLabelValue('LabelKey', 'Fallback')` — import from `useConstantsStore()` |
| `{{ 'LabelKey' \| translate:{ name: vm.x } }}` | `` `${getLabelValue('LabelKey', 'Fallback')} ${x}` `` (computed) |
| `{{ value \| date:'mediumDate' }}` | `DateTime.fromISO(value).toLocaleString(DateTime.DATE_MED)` (Luxon) |
| `{{ value \| currency }}` | `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)` |
| `ng-repeat="x in items \| filter:q"` | `computed(() => items.value.filter(...))` |
| `ng-repeat="x in items \| orderBy:'name'"` | `computed(() => [...items.value].sort(...))` |
| `ng-transclude` | `<slot />` |
| `ng-transclude-slot="name"` (call site) | `<template #name>...</template>` |
| `transclude: { name: '?slot' }` (definition) | `<slot name="name" />` |
| `$state.go('state.name', params)` | `router.push({ name: RouteNames.StateName, params })` |
| `$stateParams.guid` | `route.params.guid` (use `computed`) |
| `$location.url(path)` | `router.push(path)` |
| `$watch('prop', cb)` | `watch(prop, cb)` |
| `RxJS .subscribe()` | `watch` / `watchEffect` or async/await |
| `<isc-*>` / Angular Material | `@ui` `Isc*` component first; Quasar `q-*` fallback — see `references/quasar-mappings.md` |

#### 3b: Auto-detect Pinia store vs. local state

- If the Angular controller manages data that is **shared across routes** or **persists beyond component lifecycle** (auth tokens, user profile, square data, notifications, feature flags) → generate a **Pinia store** in `MemberPortal/src/store/`.
- If the data is **local to the component** (form state, UI visibility flags, temp computation results) → use `ref` / `computed` / `reactive` inline in the component.
- Look at how the data is used: if multiple Angular services write to the same object, it should be a store.
- If migrating a service that was previously injected into multiple controllers → it should be either a Pinia store (if stateful) or a plain TS module (if stateless).

#### 3c: Handle services

**@api-first (default for HTTP calls)**

- Call generated clients from the migrated **component**, **composable**, or **Pinia store** — not a new `*-service.ts` that re-wraps the same endpoints.
- **Imports:**
  - `@api/services/query/default/<ServiceName>` — GET/read operations
  - `@api/services/command/default/<ServiceName>` — POST/PUT/command operations
  - `@api/models/query` and `@api/models/command` — DTOs, enums, request/response types (camelCase after interceptors)
- **Discovery:** search `InSites.Eco.Client.Vue/api/dist/services` for the Angular dataservice URL (e.g. `/IncentiveService/GetManualRaffles` → `IncentiveService.ts`).
- **Do not:** hand-edit files under `api/dist/` (regenerated on API build); add thin project-specific service layers unless the user explicitly asks.
- **Fallback:** use `get` / `post` / `upload` from `@/services/http-service` only when no generated method exists for that endpoint.
- **Wiring:** `configureApi` is already set in package entry points (e.g. TempLibrary `entry.ts`); migrated code should not call `configureApi` again.

**State and structure**

- **Stateful services** (cache, event bus, subscription collections) → Pinia store; may call `@api` from store actions.
- **Stateless logic** with no `@api` coverage → plain TS module with exported functions (exception, not the default when `@api` has the endpoints).

#### 3d: Generate routes (if migrating UI-Router states)

1. Generate the route config file in `MemberPortal/src/router/routes/` following the existing pattern.
2. Add the route name to `RouteNames` enum in `route-names.enum.ts`.
3. Register the route in the appropriate route module file (append to the routes array).
4. If the Angular state had resolves (data pre-fetching), add a `beforeEnter` guard that calls the service.
5. If the Angular state had auth/permission checks, use existing guards like `authorizedGuard`.
6. Generate a route unit test.

#### 3e: Generate the Jest test

Generate a `.spec.ts` file in a `__tests__/` folder next to the migrated `.vue` file (e.g. `pages/__tests__/activity-config-page.spec.ts` importing `../activity-config-page.vue`). Follow `references/testing-patterns.md` and `references/vue-templates/Component.spec.ts`.

Every test must include:
- Component mount test (shallowMount)
- Props/emits validation tests (if applicable)
- Store interaction tests (mocked Pinia using `setActivePinia` + `createPinia`)
- Router interaction tests (mocked `useRouter` / `useRoute`)
- HTTP/API mocking as needed
- Event handling tests
- Edge case tests

Use `@vue/test-utils` with `mount()` for integration tests and `shallowMount()` for isolated component tests.

### Step 4: Handle ambiguous UI mappings

When an Angular Material or `isc-ui` tag has no matching export in `SquareUi/src/components/index.ts`:

1. Confirm no `@ui` component exists under `SquareUi/src/components/` (grep by tag name).
2. Use context7 MCP to search for the closest Quasar component.
3. Analyze the match based on:
   - **Props parity**: How many props/attributes map directly
   - **Behavior parity**: How similar the behavior is (slots, events, model binding)
   - **Visual similarity**: How similar the rendered output looks
4. **If match > 80%**: Use the Quasar component directly. Add a brief `TODO` comment noting any differences.
5. **If match 50-80%**: Present both options to the user:
   - Option A: Use `<q-*>` with workarounds (explain what differs)
   - Option B: Create a custom component in `SquareUi/src/components/` following `isc-wrapper-page.vue` pattern
   - Ask the user which they prefer
6. **If match < 50%**: Suggest creating a new custom component in `SquareUi/src/components/` and offer to generate it.

When creating custom SquareUi components, follow the patterns in:
- `SquareUi/src/components/wrapper-page/isc-wrapper-page.vue` for structure
- `SquareUi/src/components/index.ts` for registration (export from barrel)

### Step 5: Place TODOs for ambiguity

If any mapping is uncertain or partial, add a `TODO` comment directly in the generated file:
```ts
// TODO: The original Angular used `isc-wizard` with dynamic step injection.
// q-stepper handles static steps well — verify dynamic behavior works.
```

### Step 6: Leave files unstaged for review

Generate all files but do NOT `git add` them. The user will review before committing.

## File Output Conventions

- **Components**: `MemberPortal/src/pages/<kebab-case-name>.vue` (or `MemberPortal/src/components/<feature>/<kebab-case-name>.vue`)
- **Services**: `MemberPortal/src/services/<kebab-case-name>/index.ts`
- **Pinia Stores**: `MemberPortal/src/store/<kebab-case-name>-store.ts`
- **Routes**: `MemberPortal/src/router/routes/<feature>.route.ts`
- **Tests**: `__tests__/<kebab-case-name>.spec.ts` next to the feature folder (e.g. `pages/__tests__/login-page.spec.ts` with `import ... from '../login-page.vue'`)

## Common Pitfalls to Avoid

1. **CSS conflicts**: Angular Material and Quasar have conflicting flex class definitions. Never use `scoped` on `<style>` — no exceptions. Read `references/common-pitfalls.md` for the reset patterns needed in `angular-component-wrapper.vue`.
2. **Reactivity**: AngularJS uses dirty checking; Vue uses Proxies. Make sure objects/arrays are reactive by using `ref()` or `reactive()`. Watch for direct property assignment on non-reactive objects.
3. **Async patterns**: AngularJS `$q` promises are standard Promises — convert `$q.all` to `Promise.all`. Do NOT keep `.then()` chains when `async/await` is more readable.
4. **Template expressions**: Angular templates allow complex expressions; Vue templates are more restrictive. Move complex logic to computed properties or methods.
5. **Form validation**: AngularJS `ng-messages` / `FormController` → Vuelidate (`@vuelidate/core` + `@vuelidate/validators`). Use `helpers.withMessage` + `getLabelValue` for translated error messages. See `references/form-validation-patterns.md` for the full pattern including server error merging.
6. **Angular filters**: Vue 3 has no filter syntax. `{{ value | date:'short' }}` → Luxon computed. `{{ 'key' | translate }}` → `getLabelValue('key', 'Fallback')`. `| filter:query` / `| orderBy:prop` → computed properties. See `references/common-pitfalls.md` section 8 for all cases.
7. **Transclusion / slots**: Every `ng-transclude` must become a `<slot />`. Named transclusion (`ng-transclude-slot="name"`) becomes `<slot name="name" />` in the component and `<template #name>` at the call site. Forgetting this leaves content silently dropped. See `references/common-pitfalls.md` section 11.
