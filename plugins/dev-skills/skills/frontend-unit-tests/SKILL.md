---
name: frontend-unit-tests
description: |
  Write Vue 3 frontend unit tests based on the current git branch changes. Use this skill
  whenever the user asks to write, generate, add, or scaffold unit tests for a Vue frontend
  project — especially when working on a feature branch and no project-specific test skill
  is available. Trigger on: "write tests for this branch", "add unit tests", "generate tests
  for my changes", "cover my changes with tests", "write tests for X component", "test this
  composable", "can you test this?", or any request to improve frontend test coverage.
  Works on any Vue 3 project by learning its test conventions at runtime.
---

# Generic Vue 3 Frontend Unit Test Writer

You write unit tests for Vue 3 frontend changes on the current git branch. You learn the
project's test conventions at runtime — never hardcode assumptions about UI library, store,
router, or test helpers.

---

## Step 1: Detect changed files

```bash
git diff $(git merge-base HEAD main)...HEAD --name-only
```

If `main` doesn't exist, try `master`, then `develop`. If none exist, fall back to:
```bash
git diff HEAD~1 --name-only
```

Filter to `.vue`, `.ts`, and `.js` files only (excluding `.spec.*` and `.test.*`), then
apply the testability filter below.

---

## Step 2: Filter to testable files

**Include** files likely to contain meaningful logic:
- Vue components (`.vue`) with more than trivial template rendering
- Composables (`use*.ts`)
- Utility/helper functions with branching or transformation logic
- Service wrappers or API clients

**Exclude:**
- Existing test files (`*.spec.*`, `*.test.*`, `__tests__/**`)
- Pure type/interface files
- Auto-generated files (e.g. `*.g.ts`, generated API clients unless specifically requested)
- Route definition files, store index files with no logic, plain constant files
- `main.ts` / entry points / plugin registration

When in doubt, include — a spurious test is less harmful than a missed one.

---

## Step 3: Learn the project's test conventions

### 3a. Find the test runner config

Look for `jest.config.*`, `vitest.config.*`, or `vite.config.*` (which may embed a `test`
block). Note:
- **Test runner**: Jest vs Vitest
- **Global setup**: any `setupFiles` or `setupFilesAfterEach` entries — read them
- **Module aliases**: `@/` → `src/`, etc. — you'll need these for imports
- **Transform / preset**: e.g. `@vue/vue3-jest`, `@vitejs/plugin-vue`

### 3b. Sample 2–3 existing test files near the changed code

Find test files (`.spec.ts`, `.test.ts`) whose folder path matches the changed files as
closely as possible. Read them fully. Extract:

| Convention | What to look for |
|---|---|
| **Mount style** | `shallowMount` vs `mount` (default preference) |
| **Wrapper typing** | `VueWrapper<InstanceType<typeof X>>` or `ReturnType<typeof createWrapper>` |
| **Global plugins** | Are Pinia / router / UI library installed globally in `mountOptions`? |
| **Store setup** | Pinia (`useMyStore().$reset()`), Vuex, or none |
| **Router setup** | `router.addRoute` + `router.push` + `await router.isReady()`, or mocked |
| **Composable helper** | Any `withSetup` / `mountComposable` / `useSetup` wrapper |
| **Mock style** | `jest.mock(...)` / `vi.mock(...)`, `jest.spyOn` / `vi.spyOn` |
| **Async** | `await wrapper.vm.$nextTick()` vs `await flushPromises()` |
| **i18n / labels** | Is translation stubbed, or set via a store/plugin? |

### 3c. Read any shared test utilities

Look at `import` statements in the sampled tests for non-standard helpers:
- `utils` / `helpers` files inside `__tests__` directories
- Base setup files (`setup.ts`, `test-utils.ts`)
- Custom matchers

Read the source of anything imported that isn't from `@vue/test-utils`, `vitest`, or `jest`.
**Use these helpers in your generated tests.** Don't reinvent what the project already provides.

---

## Step 4: Analyse each changed file

For each testable file from Step 2:

1. Read the full current source
2. Read the git diff for that file to identify what's **new or changed** — new components,
   new props/emits, new composable logic, added branches in utilities
3. Focus test generation on those changes only

---

## Step 5: Find or create the test file

**Location**: a `__tests__` directory immediately adjacent to the file being tested:

```
src/components/my-feature/
├── my-feature.vue
└── __tests__/
    └── my-feature.spec.ts
```

Same pattern for composables, utilities, and services.

**If the test file already exists:**
- Read it fully
- Identify which behaviour is already covered
- Only add tests for what is **new or changed in the diff** — do not duplicate existing tests

**If it does not exist:**
- Create it following the structure from Step 3b exactly (same imports, same wrapper
  typing, same describe/test style)

---

## Step 6: Generate the tests

For each changed component/composable/utility, write tests covering:

1. **Happy path** — normal expected behavior
2. **Branches** — each `if`/`else` that changes the output
3. **Edge cases** — null/undefined inputs, empty arrays, boundary values
4. **Side effects** — emitted events, router navigation, service calls

**Rules:**
- Match the naming convention and style from Step 3b exactly
- Use `shallowMount` by default; use `mount` only when child component rendering is needed
- Assert on public outputs: rendered HTML, emitted events, service call args — not internal
  state via `wrapper.vm`
- Use the project's async helper (`$nextTick` or `flushPromises`) — don't add `setTimeout`
- Use project helpers discovered in Step 3c; don't reinvent them
- Include a snapshot test (`expect(wrapper.html()).toMatchSnapshot()`) for components
- Target **≥70% coverage** for new code

---

## Step 7: Report

After writing all files, tell the user:
- Which test files were **created** (new)
- Which test files were **modified** (existing, tests added)
- For each: a one-line summary of how many tests were added and what they cover

---

## Common pitfalls

- **Don't hardcode UI library stubs** (Quasar, Vuetify, etc.) — discover from samples
- **Don't guess store/router setup** — read existing tests to see how they're initialized
- **Don't use `wrapper.vm` to assert internal state** — test public outputs
- **Don't reinvent helpers** the project already has in its test utilities
- **Don't create the test runner config** if none exists — tell the user and stop
- **Don't test unchanged code** that already has test coverage
