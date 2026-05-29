# Testing Patterns for Migrated Vue Components

Based on existing Jest + @vue/test-utils patterns in the project.

## Rules

- Use **Jest** only: `jest.fn`, `jest.mock`, `jest.requireActual` — not Vitest (`vi.*`).
- Migrated components use **Composition API** (`useRouter`, `useRoute`, Pinia stores). Do not mock Options API `$router` / `$route`.
- Place specs in **`__tests__/`** next to the feature folder; import the Vue file with `../kebab-case-name.vue`.
- Reset Pinia with **`setActivePinia(createPinia())`** in `beforeEach` (MemberPortal pattern).

## Setup

The project uses:
- Jest 29 with `@swc/jest` for fast transpilation
- `@vue/test-utils` for component mounting
- `jest-environment-jsdom` for DOM simulation
- `jest-canvas-mock` for canvas mocking

## Standard Test Template

```ts
// MemberPortal/src/pages/__tests__/my-feature-page.spec.ts
import { shallowMount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createWebHistory } from 'vue-router';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { nextTick } from 'vue';

import MyFeaturePage from '../my-feature-page.vue';

describe('my-feature-page', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());

    router = createRouter({
      history: createWebHistory(),
      routes: [
        {
          path: '/test',
          name: 'Test',
          component: MyFeaturePage,
        },
      ],
    });
  });

  it('renders without crashing', () => {
    const wrapper = shallowMount(MyFeaturePage, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('displays the correct data from store', async () => {
    const store = useSomeStore();
    store.someValue = 'test data';

    const wrapper = shallowMount(MyFeaturePage, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain('test data');
  });
});
```

## Store Mocking

```ts
import { useAuthenticationStore } from '@/store/authentication-store';

it('shows login button when not authenticated', () => {
  setActivePinia(createPinia());

  const wrapper = shallowMount(ProtectedPage, {
    global: { plugins: [router] },
  });

  expect(wrapper.find('[data-testid="login-btn"]').exists()).toBe(true);
});

it('shows content when authenticated', () => {
  setActivePinia(createPinia());
  const authStore = useAuthenticationStore();
  authStore.token = 'mock-token';
  authStore.isAuthenticated = true;

  const wrapper = shallowMount(ProtectedPage, {
    global: { plugins: [router] },
  });

  expect(wrapper.find('[data-testid="content"]').exists()).toBe(true);
});
```

## HTTP Mocking

Prefer mocking **`@api` service modules** (matches how migrated code calls the backend):

```ts
jest.mock('@api/services/query/default/IncentiveService', () => ({
  getManualRaffles: jest.fn(),
}));
```

Fall back to mocking `@/services/http-service` only when the code under test uses `get`/`post` directly (no `@api` client).

```ts
jest.mock('@/services/feature-service', () => ({
  isFeatureEnabledForSquare: jest.fn().mockResolvedValue(true),
  isMasterFeatureEnabledForSquare: jest.fn().mockResolvedValue(false),
}));

jest.mock('@/services/http-service', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

it('loads data on mount', async () => {
  const { get } = await import('@/services/http-service');
  (get as jest.Mock).mockResolvedValue({ items: ['a', 'b'] });

  const wrapper = shallowMount(DataPage, {
    global: { plugins: [router] },
  });

  await nextTick();
  expect(wrapper.text()).toContain('a');
});
```

## Router Mocking (Composition API)

Mock `useRouter` / `useRoute` when testing navigation or route params. Do not use `mocks: { $router }`.

```ts
const mockPush = jest.fn();

jest.mock('vue-router', () => ({
  ...jest.requireActual('vue-router'),
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
  useRoute: () => ({
    params: { guid: 'test-guid' },
    query: {},
    name: RouteNames.Test,
  }),
}));

it('pushes to home on logout', async () => {
  mockPush.mockClear();

  const wrapper = shallowMount(ProfilePage, {
    global: { plugins: [router] },
  });

  await wrapper.find('[data-testid="logout-btn"]').trigger('click');
  expect(mockPush).toHaveBeenCalledWith({ name: RouteNames.Home });
});
```

When navigation is not under test, a real `createRouter` + `plugins: [router]` is enough (no `vue-router` mock).

## Prop Testing

```ts
it('renders with props', () => {
  const wrapper = shallowMount(SomeComponent, {
    props: {
      title: 'Test Title',
      items: ['a', 'b'],
      disabled: true,
    },
  });

  expect(wrapper.find('.title').text()).toBe('Test Title');
  expect(wrapper.findAll('li')).toHaveLength(2);
});

it('emits events', async () => {
  const wrapper = shallowMount(SomeComponent, {
    props: { modelValue: '' },
  });

  await wrapper.find('input').setValue('new value');
  expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  expect(wrapper.emitted('update:modelValue')![0]).toEqual(['new value']);
});
```

## Async Operation Testing

```ts
it('shows loading state while fetching', async () => {
  const { get } = await import('@/services/http-service');
  (get as jest.Mock).mockReturnValue(new Promise(() => {}));

  const wrapper = shallowMount(AsyncPage, {
    global: { plugins: [router] },
  });

  expect(wrapper.find('[data-testid="loading"]').exists()).toBe(true);
});

it('handles errors gracefully', async () => {
  const { get } = await import('@/services/http-service');
  (get as jest.Mock).mockRejectedValue(new Error('Network error'));

  const wrapper = shallowMount(AsyncPage, {
    global: { plugins: [router] },
  });

  await nextTick();
  await nextTick();

  expect(wrapper.find('[data-testid="error"]').text()).toContain('Network error');
});
```

## What Every Migrated Component Test Must Cover

1. **Render test**: Component mounts without errors
2. **Props test**: Correct rendering with various prop values
3. **Emits test**: Events are emitted correctly (if applicable)
4. **Store interaction test**: Component reads/writes store correctly (if applicable)
5. **Router interaction test**: Navigation triggered correctly (if applicable)
6. **HTTP interaction test**: API calls are made on mount/action (if applicable)
7. **Loading/error states**: Async operations show correct UI states
8. **Edge cases**: Empty data, null values, error responses
