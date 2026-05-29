# Service Migration Pattern Reference

Based on existing patterns in `MemberPortal/src/services/`.

## Stateless Service (Plain TS Module)

Use when the service has no shared state and either (a) no `@api` client exists for the endpoint, or (b) the module only contains pure transforms with no HTTP. **When `@api` covers the endpoints, call `@api` from the `.vue` file or Pinia store instead of adding a wrapper module.**

```ts
// MemberPortal/src/services/feature-service.ts
import { get } from '@/services/http-service';

export async function isFeatureEnabledForSquare(featureName: string): Promise<boolean> {
  const result = await get<{ isEnabled: boolean }>('/feature/is-enabled', {
    featureName,
  });
  return result.isEnabled;
}
```

### Convention:
- File name: `kebab-case-name.ts` or `kebab-case-name/index.ts`
- Exports individual async functions
- Imports `get`, `post`, `put`, `upload` from `@/services/http-service`
- No classes, no decorators
- TypeScript generics for response types

## Stateful Service → Pinia Store

Use when the service caches data, holds subscriptions, or shares state across components.

See `references/pinia-patterns.md`.

## HTTP Service (Already Exists)

The project already has a full HTTP layer. Do NOT regenerate it. Import from:

```ts
import { get, post, put, upload } from '@/services/http-service';
```

Available HTTP methods:
- `get<T>(url, params?, config?, baseUrl?)` → `Promise<T>`
- `post<T>(url, data?, params?, config?, baseUrl?, withCredentials?)` → `Promise<T>`
- `put<T>(url, data?, params?, config?, baseUrl?, withCredentials?)` → `Promise<T>`
- `upload<T>(url, formData?, params?, config?, baseUrl?)` → `Promise<T>`

Base URLs are automatically configured via server constants. You usually don't need to pass a base URL.

### Response Transformation

The HTTP interceptor automatically:
- CamelCases all PascalCase .NET property names
- Converts Luxon DateTime strings to proper dates
- Handles 401 (auto-refresh), 500, 503

## API Auto-Generated Client (@api-first)

Most backend endpoints are auto-generated in `InSites.Eco.Client.Vue/api/`. **Default:** import and call them directly from the migrated page, component, or store.

```ts
// In a page or store — preferred
import { getManualRaffles } from '@api/services/query/default/IncentiveService';
import { processUploadedExcelFile } from '@api/services/command/default/IncentiveService';
import { ManualRaffleListItemResponse, Feature } from '@api/models/query';
import { TriggerManualRewardRequest } from '@api/models/command';

const result = await getManualRaffles();
await processUploadedExcelFile({
  blob: uploadBlob,
  name: rewardName,
  approvalType,
} satisfies TriggerManualRewardRequest);
```

### When not to add a wrapper service

| Angular | Migrated |
|---------|----------|
| `incentiveservice.getManualRaffles()` | `getManualRaffles()` from `@api/services/query/default/IncentiveService` in the `.vue` file or store |
| Local interfaces duplicating backend DTOs | Import from `@api/models/query` or `@api/models/command` |
| New `incentive-service/index.ts` copying the same URLs | Avoid unless the user requests abstraction |

### Rules

- Search `api/dist/services/query/default/` and `api/dist/services/command/default/` to map Angular `httpService` URLs to generated functions.
- Do **not** hand-edit `api/dist/` — it is regenerated when building QueryApi/CommandApi.
- Do **not** call `configureApi` in migrated code; package entry points (e.g. TempLibrary `entry.ts`) already wire `httpService` for `@api`.
- Use `@/services/http-service` (`get`, `post`, `upload`) only when no generated method exists for that endpoint.

## Example: Migrating AngularJS Service

**AngularJS:**
```ts
export class ActivityService {
  static $inject = ['$http', '__env'];
  constructor(
    private $http: ng.IHttpService,
    private __env: Environment,
  ) {}

  getActivities(squareGuid: string) {
    return this.$http.get(`${this.__env.queryApiUrl}/activities`, {
      params: { squareGuid },
    }).then(r => r.data);
  }
}
```

**Vue 3 (@api-first — if `ActivityService` exists in `@api`):**
```ts
// In the page or store — preferred
import { listActivities } from '@api/services/query/default/ActivityService';
import { ProgramActivityListItem } from '@api/models/query';

export async function loadActivities(programGuid: string): Promise<ProgramActivityListItem[]> {
  const result = await listActivities(programGuid);
  return result.list ?? [];
}
```

**Vue 3 (fallback — only when no `@api` client exists):**
```ts
import { get } from '@/services/http-service';

export async function getActivities(squareGuid: string): Promise<Activity[]> {
  return get<Activity[]>('/activities', { squareGuid });
}
```
