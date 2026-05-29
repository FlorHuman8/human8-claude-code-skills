import { RouteRecordRaw } from 'vue-router';
import { RouteNames } from './route-names.enum';

/* TODO: Add this route config to the appropriate route module file */
/* RouteNames enum values stay UI-Router-style strings; Vue page files use kebab-case. */

export const myFeatureRoute: RouteRecordRaw = {
  path: '/feature/:guid',
  name: RouteNames.MyFeature,
  component: () => import('@/pages/my-feature-page.vue'),
  meta: {
    title: 'My Feature',
    // TODO: Add meta flags based on Angular state data
  },
  /* TODO: Convert UI-Router resolves to beforeEnter guard if needed */
  beforeEnter: async (to, from) => {
    // Data prefetching / permissions check
  },
};

/* TODO:
 * 1. Add route name to RouteNames enum in route-names.enum.ts
 * 2. Import and register in router/routes/index.ts
 * 3. Add route to the appropriate feature module array
 * 4. Route unit test in router/routes/**/__tests__/
 */
