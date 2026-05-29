---
name: frontend-unit-test
description: |
  Write front-end unit tests for the InSites Eco Vue 3 codebase (MemberPortal and SquareUi).
  Use this skill whenever the user asks to write, add, generate, or create unit tests for Vue
  components, composables, utilities, or services in the InSites Eco frontend. Trigger on:
  "write tests for", "add tests", "test this component", "test this composable", "cover this
  with tests", "write a spec for", "add unit tests", or any request to test frontend code in
  the InSites Eco project. Also trigger when the user pastes a Vue component or composable and
  asks "can you test this?" or similar. Stack: Vue 3 + Quasar 2 + TypeScript + Jest + @vue/test-utils.
  Always use this skill instead of guessing at patterns — the project has specific conventions.
---

# Vue Unit Test Skill — InSites Eco

Writing tests for the **InSites Eco** Vue 3 frontend (MemberPortal and SquareUi).
Follow these conventions exactly — they match the existing codebase and Jest setup.

## File Placement

Put the `.spec.ts` file in a `__tests__` directory immediately adjacent to the file being tested:

```
src/components/my-feature/
├── my-feature.vue
└── __tests__/
    └── my-feature.spec.ts
```

Same pattern for composables (`composables/__tests__/`) and utilities (`utils/__tests__/`).

## Test Structure

Always use `describe` + `test` (or `it`). `beforeEach` for shared setup. Keep describe names
matching the file/feature name (kebab-case).

```ts
describe('feature-name', () => {
  beforeEach(() => {
    // reset state here
  });

  test('does the thing', () => {
    // ...
  });
});
```

---

## Component Tests

Use `shallowMount` unless child components must render. Type the wrapper as
`VueWrapper<InstanceType<typeof YourComponent>>`.

```ts
import { shallowMount, VueWrapper } from '@vue/test-utils';
import MyComponent from '../my-component.vue';

describe('my-component', () => {
  let wrapper: VueWrapper<InstanceType<typeof MyComponent>>;

  const defaultProps: PropType<typeof MyComponent> = {
    title: 'Hello',
    active: true,
  };

  beforeEach(() => {
    wrapper = shallowMount(MyComponent, {
      props: defaultProps,
    });
  });

  it('renders correctly', () => {
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('emits click event', async () => {
    await wrapper.find('button').trigger('click');
    expect(wrapper.emitted('click')).toHaveLength(1);
  });
});
```

Use `mount` (not `shallowMount`) only when the test needs real child components to render.

---

## Service / Utility Tests

Use `jest.mock<Partial<typeof module>>(...)` for type-safe mocking:

```ts
import * as myService from '@api/services/command/default/MyService';
import { myUtil } from '../my-util';

jest.mock<Partial<typeof myService>>('@api/services/command/default/MyService', () => ({
  fetchSomething: jest.fn().mockResolvedValue({ id: '123', name: 'test' }),
  saveSomething: jest.fn(),
}));

describe('my-util', () => {
  test('fetches and transforms data', async () => {
    const result = await myUtil('123');
    expect(result).toEqual({ id: '123', label: 'test' });
    expect(myService.fetchSomething).toBeCalledWith('123');
  });

  test('override mock for a single test', async () => {
    jest.spyOn(myService, 'fetchSomething').mockResolvedValue(null);
    const result = await myUtil('unknown');
    expect(result).toBeNull();
  });
});
```

---

## Composable Tests

Use the `withSetup` helper that already exists in both MemberPortal and SquareUi.
It mounts a minimal Vue app with router and Pinia already wired in.

```ts
// MemberPortal: import from '@/composables/__tests__/utils'
// SquareUi:     import from 'src/composables/__tests__/utils'
import { withSetup } from '@/composables/__tests__/utils';
import { useMyComposable } from '../use-my-composable';

describe('use-my-composable', () => {
  test('returns expected reactive state', () => {
    const [run] = withSetup(useMyComposable);
    const { someValue, someFlag } = run();

    expect(someValue.value).toBe('expected');
    expect(someFlag.value).toBe(false);
  });
});
```

---

## Router-Dependent Tests

Register the route and push to it in `beforeEach`. Always `await router.isReady()`.

```ts
import router from '@/router';
import { RouteNames } from '@/router/routes/route-names.enum';
import { h } from 'vue';

beforeEach(async () => {
  router.addRoute({
    path: '/my-route/:id',
    name: RouteNames.MyRoute,
    component: h('div'),
  });

  await router.push({ name: RouteNames.MyRoute, params: { id: 'test-id' } });
  await router.isReady();
  jest.spyOn(router, 'push').mockImplementation();
});
```

---

## Pinia Store Setup

Reset store state directly in `beforeEach`:

```ts
import { useMyStore } from '@/store/my-store';

beforeEach(() => {
  useMyStore().$reset();
  // or set specific state:
  useMyStore().items = [];
});
```

---

## Common Assertions

```ts
expect(result).toEqual({ id: '1', name: 'foo' });   // deep equality
expect(flag.value).toBe(true);                        // primitives
expect(myService.fetch).toBeCalledWith('arg1');        // call args
expect(myService.fetch).toBeCalledTimes(1);            // call count
expect(router.push).not.toBeCalled();                  // not called
expect(wrapper.html()).toMatchSnapshot();               // snapshot
expect(wrapper.find('.my-class').exists()).toBe(true); // DOM
```

---

## What to Cover

1. **Happy path** — normal expected behavior
2. **Branches** — each `if`/`else` that changes the outcome
3. **Edge cases** — null/undefined, empty arrays, boundary values
4. **Side effects** — router navigation, service calls, emitted events

Target **≥70% unit test coverage** for new code (project convention per CLAUDE.md).

## What to Avoid

- Don't use `mount` when `shallowMount` is sufficient
- Don't use `wrapper.vm` to assert internal state — test outputs (props, emits, HTML)
- Don't hardcode i18n label keys — set `useConstantsStore().labels.key = 'value'` and assert on the resolved string
- Don't use `setTimeout`/`sleep` — `await` async operations or use `flushPromises`
