# Vue Router Pattern Reference

Based on `MemberPortal/src/router/`.

## Router Setup

```ts
// MemberPortal/src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { routes } from './routes';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

// Global guards
router.beforeEach(startupGuard);
router.beforeEach(authorizedGuard);
router.beforeEach(pageAccessGuard);
// ...

export default router;
```

## Route Name Enum

All route names are centralized in an enum:

```ts
// MemberPortal/src/router/routes/route-names.enum.ts
export enum RouteNames {
  // Container
  Home = 'container.main.home',
  Login = 'container.login',
  Main = 'container.main',

  // Forum
  Forum = 'container.main.forum',
  ForumRoom = 'container.main.forum.room',
  ForumConversation = 'container.main.forum.conversation',
  ForumNew = 'container.main.forum.new',

  // Profile
  Profile = 'container.main.profile',
  ProfileEdit = 'container.main.profile.edit',

  // Activities
  ActivityDetail = 'container.main.activity.detail',
  ActivityConfig = 'container.main.activity.config',
  ActivityList = 'container.main.activity.list',
}
```

**Always add new route names to this enum when migrating routes from UI-Router.**

## Route Module Pattern

Routes are organized by feature in individual files and merged in an index:

```ts
// MemberPortal/src/router/routes/main.route.ts
import { RouteRecordRaw } from 'vue-router';
import { RouteNames } from './route-names.enum';
import MainLayout from '@/layouts/main-layout.vue';

export const mainRoute: RouteRecordRaw = {
  path: '/main',
  name: RouteNames.Main,
  component: MainLayout,
  meta: { title: 'Main' },
  children: [
    {
      path: 'home',
      name: RouteNames.Home,
      component: () => import('@/pages/home-page.vue'),
      meta: { title: 'Home' },
    },
    // ... more children
  ],
};
```

```ts
// MemberPortal/src/router/routes/index.ts
import { mainRoute } from './main.route';
import { forumRoute } from './forum.route';
import { activitiesRoute } from './activities.route';
import { loginRoute } from './login.route';

export const routes: RouteRecordRaw[] = [
  loginRoute,
  mainRoute,
  forumRoute,
  activitiesRoute,
];
```

## Route Meta

Use `meta` for page-level metadata:
```ts
{
  path: 'profile',
  name: RouteNames.Profile,
  component: () => import('@/pages/profile-page.vue'),
  meta: {
    title: 'Profile',
    requiresAuth: true,
    featureFlag: Feature.ProfilePage,
  },
}
```

## Lazy Loading

Always use dynamic imports for route components:
```ts
component: () => import('@/pages/some-page.vue')
```

## Global Guards

The project has these pre-existing guards in `MemberPortal/src/router/global-guards/`:

| Guard | Purpose |
|-------|---------|
| `subdomainGuard` | Redirect wrong subdomains |
| `startupGuard` | Wait for store initialization |
| `authorizedGuard` | Redirect unauthorized users |
| `pageAccessGuard` | Check page-level permissions |
| `splashPageGuard` | Show splash screen |
| `forceMobileAppGuard` | Force mobile app page |
| `migrationGuard` | Azure AD migration flow |
| `redirectFromWebviewGuard` | Webview redirect |
| `documentTitleGuard` | Set page titles from `meta.title` |

Reuse these instead of writing new ones. For AngularJS route resolves, convert to `beforeEnter` guards:

```ts
{
  path: 'activity/:guid',
  name: RouteNames.ActivityConfig,
  component: () => import('@/pages/ActivityConfigPage.vue'),
  beforeEnter: async (to, from) => {
    const store = useSquareStore();
    if (!store.isInitialized) {
      await store.init(to.params.guid as string);
    }
  },
}
```

## UI-Router to Vue Router Mapping Table

| UI-Router Concept | Vue Router Equivalent |
|-------------------|----------------------|
| `state: { url: '/path' }` | `{ path: '/path', name: ... }` |
| `state: { parent: 'root.square' }` | Route nesting `{ path: '/square', children: [...] }` |
| `state: { abstract: true }` | Layout route with `children` and no `component` |
| `state: { resolve: { data: fn } }` | `beforeEnter` guard or `onBeforeMount` in component |
| `state: { data: { title: '...' } }` | `meta: { title: '...' }` |
| `$state.go('name', params)` | `router.push({ name: 'Name', params })` |
| `$stateParams.guid` | `route.params.guid` |
| `$location.url(path)` | `router.push(path)` |
| `$location.search()` | `route.query` |

## Route Registration Workflow

When migrating a UI-Router state:

1. Create a new route file in `MemberPortal/src/router/routes/` if needed
2. Add the route to the routes array
3. Add the route name to `RouteNames` enum
4. Register in `MemberPortal/src/router/routes/index.ts` if using a new module
5. Add `beforeEnter` guards for any data resolves
6. Set `meta.title` for document title (handled by existing guard)
