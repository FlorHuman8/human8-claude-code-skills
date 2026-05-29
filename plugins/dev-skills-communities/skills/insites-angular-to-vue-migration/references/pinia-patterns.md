# Pinia Store Pattern Reference

Based on existing stores in `MemberPortal/src/store/` and `SquareUi/src/stores/`.

## HTTP in store actions (@api-first)

When migrating an AngularJS service to a Pinia store:

1. Find the generated client in `InSites.Eco.Client.Vue/api/dist/services` (query vs command).
2. Call `@api` functions from store **actions**; import DTOs from `@api/models/query` or `@api/models/command`.
3. Do **not** add store actions that only re-wrap the same `@api` call unless the user asks for abstraction.
4. Use `@/services/http-service` (`get`, `post`, `upload`) only when no `@api` method exists for that endpoint.

Some **existing** MemberPortal stores still use `http-service` directly; new migrations should prefer `@api`. See `vue-templates/PiniaStore.ts` and `service-patterns.md`.

## Pattern: Options API style (migrated store)

The project uses the Options API style for Pinia stores. Prefer this over the setup function style.

```ts
// MemberPortal/src/store/my-feature-store.ts
import { defineStore } from 'pinia';
// import { getSquareInfo } from '@api/services/query/default/SquareService';
// import type { SquareResponse } from '@api/models/query';

interface MyFeatureState {
  data: SquareResponse | null;
  isInitialized: boolean;
  loading: boolean;
}

export const useMyFeatureStore = defineStore('myFeature', {
  state: (): MyFeatureState => ({
    data: null,
    isInitialized: false,
    loading: false,
  }),

  getters: {
    hasData: (state) => state.data !== null,
  },

  actions: {
    async init(squareGuid: string) {
      if (this.isInitialized) return;
      this.loading = true;
      try {
        // this.data = await getSquareInfo({ squareGuid });

        // FALLBACK: only when api/dist has no generated method
        // import { get } from '@/services/http-service';
        // this.data = await get<SquareResponse>(`/squares/${squareGuid}`);
        this.isInitialized = true;
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.data = null;
      this.isInitialized = false;
    },
  },
});
```

## Usage in Components

```ts
import { useAuthenticationStore } from '@/store/authentication-store';

const authStore = useAuthenticationStore();
const token = computed(() => authStore.token);
const isLoggedIn = computed(() => authStore.isAuthorized);

// Calling actions
await authStore.login(username, password);
```

## Auto-Detection Rules

When migrating an AngularJS service, decide between **Pinia store** and **plain TS module** using these rules:

**Use Pinia store when the Angular service:**
1. Has cached data (e.g., `this.cachedItems = [...]`)
2. Emits events that other components listen to (e.g., `this.listeners.push(cb)`)
3. Holds application-wide state (auth, user, square, feature flags)
4. Has methods that modify internal state and return void
5. Has subscriptions that need cleanup (event listeners, SignalR connections)
6. Is used by multiple controllers/routes

**Use plain TS module when the Angular service:**
1. Only makes HTTP calls and returns data
2. Transforms data without caching it
3. Has no internal state (all data is passed through params)
4. Is stateless utility (date formatting, string manipulation)

## SquareUi Stores

Stores in `SquareUi/src/stores/` follow the same pattern:
```ts
export const useDiscussionLoungeStore = defineStore('discussionLounge', {
  state: () => ({ rooms: [], activeRoom: null }),
  getters: { /* ... */ },
  actions: { /* ... */ },
});
```
