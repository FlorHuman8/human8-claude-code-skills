# AngularJS → Vue 3 Pattern Mappings

Complete reference table for converting AngularJS (1.8.2) code to Vue 3 + Quasar patterns used in the InSites.Eco project.

## Architecture Mappings

| AngularJS | Vue 3 |
|-----------|-------|
| `angular.module('insitesApp', [...])` | No equivalent — ES modules with `import` / `export` |
| `module.component('name', { ... })` | Single File Component (`.vue`) |
| `module.service('Name', Class)` | Plain TS module with exported functions |
| `module.controller('Name', Class)` | `<script setup>` with `ref` / `computed` |
| `module.factory('name', fn)` | Exported function or composable |
| `module.constant('name', value)` | `export const name = value` or environment config |
| `module.config(...)` | `main.ts` app initialization |
| `module.run(...)` | `main.ts` app initialization or Pinia store actions |
| UI-Router (`@uirouter/angularjs`) | Vue Router 4 |
| `$stateProvider` | `createRouter()` with route definitions |
| `$urlRouterProvider` | `createWebHistory()` |
| `$transitions` | `router.beforeEach()` / `router.afterEach()` |
| Angular Material (`ngMaterial`) | Quasar 2 |
| `isc-ui` components | Quasar components or custom `SquareUi` components |

## Component Lifecycle

| AngularJS | Vue 3 |
|-----------|-------|
| `$onInit()` | `onMounted()` |
| `$onChanges(changes)` | `watch()` |
| `$doCheck()` | `watch()` with deep: true |
| `$postLink()` | `onMounted()` (after template render) |
| `$onDestroy()` | `onBeforeUnmount()` |
| `$scope.$watch(expr, cb)` | `watch()` or `watchEffect()` |
| `$scope.$apply()` | Not needed |
| `$scope.$digest()` | Not needed |
| `$scope.$broadcast(event, data)` | Provide/Inject, composables, or Pinia |

## Component Bindings

| AngularJS Binding | Vue 3 Equivalent |
|-------------------|-----------------|
| `bindings: { name: '@' }` | `defineProps<{ name: string }>()` |
| `bindings: { item: '<' }` | `defineProps<{ item: ItemType }>()` |
| `bindings: { onChange: '&' }` | `defineEmits<{ onChange: [value: any] }>()` |
| `bindings: { config: '=' }` | `defineProps<{ config: ConfigType }>()` + `v-model` or event emit |
| No bindings (controller only) | Direct `<script setup>` variables |

## Dependency Injection

| AngularJS | Vue 3 |
|-----------|-------|
| `static $inject = ['ServiceName']` | `import { serviceFunction } from '@/services/service'` |
| Constructor injection | Top-level async calls in `<script setup>` |
| `$injector.get('name')` | Dynamic `import()` or Pinia store |

## Template Directives

| AngularJS | Vue 3 |
|-----------|-------|
| `ng-if="condition"` | `v-if="condition"` |
| `ng-show="condition"` | `v-show="condition"` |
| `ng-hide="condition"` | `v-show="!condition"` |
| `ng-repeat="item in items"` | `v-for="item in items"` |
| `ng-click="fn(arg)"` | `@click="fn(arg)"` |
| `ng-submit="fn()"` | `@submit.prevent="fn"` |
| `ng-change="fn()"` | `@change="fn"` |
| `ng-class="{cls: expr}"` | `:class="{cls: expr}"` |
| `ng-style="{prop: val}"` | `:style="{prop: val}"` |
| `ng-model="prop"` | `v-model="prop"` |
| `ng-bind="expr"` | `{{ expr }}` |
| `ng-bind-html="html"` | `v-html="html"` (use with caution) |
| `ng-disabled="expr"` | `:disabled="expr"` |
| `ng-readonly="expr"` | `:readonly="expr"` |
| `ng-required="expr"` | `:required="expr"` |
| `ng-href="{{url}}"` | `:href="url"` |
| `ng-src="{{url}}"` | `:src="url"` |
| `ng-attr-*="{{val}}"` | dynamic attribute binding |
| `ng-cloak` | Not needed (Vue handles FOUC) |
| `ng-form="name"` | `<form @submit.prevent>` |
| `ng-messages` | Vuelidate (installed in project) |
| `ng-message` | Vuelidate component |
| `ng-switch` / `ng-switch-when` | `v-if` / `v-else-if` |
| `ng-options` | `v-for` on `<option>` or `<q-option-group>` |
| `ng-init` | Move logic to `<script setup>` |

## UI-Router → Vue Router

| UI-Router | Vue Router |
|-----------|-----------|
| `$state.go('name', params)` | `router.push({ name: 'name', params })` |
| `$stateParams.param` | `route.params.param` |
| `$state.current.name` | `route.name` |
| `state: { url: '/path' }` | `{ path: '/path', name: 'Name', component: ... }` |
| `state: { resolve: { data: fn } }` | Route `beforeEnter` guard or component `onBeforeMount` |
| `state: { data: { title: '...' } }` | Route `meta: { title: '...' }` |
| `state: { parent: 'parent' }` | Nested routes with `children` |
| `state: { abstract: true }` | Route with `children` and no `component` |
| `ui-sref="state.name({param: val})"` | `<router-link :to="{ name: 'Name', params: { param: val } }">` |
| `ui-view` | `<router-view>` |
| `$transitions.onSuccess(...)` | `router.afterEach(...)` |
| `$transitions.onError(...)` | `router.onError(...)` |
| `$location.url(path)` | `router.push(path)` |
| `$location.search()` | `route.query` |

## isc-ui → @ui (preferred) / Quasar (fallback)

Check `SquareUi/src/components/index.ts` before using this table.

| isc-ui Component | @ui Vue component (when exported) | Quasar fallback |
|-----------------|-----------------------------------|-----------------|
| `isc-email` | `IscEmail` | `q-input type="email"` |
| `isc-pagination` | `IscPagination` | `q-pagination` |
| `isc-modal-dialog` | `IscDialog` | `$q.dialog()` |
| `isc-wrapper-page` | `IscWrapperPage` | — |
| `isc-button` | — | `q-btn` |
| `isc-input` | — | `q-input` |
| `isc-dropdown` | `IscGroupedDropdown` (when grouped) | `q-select` |
| `isc-textarea` | — | `q-input` (type="textarea") |
| `isc-checkbox` | — | `q-checkbox` |
| `isc-switch` | — | `q-toggle` |
| `isc-radio-button` / `isc-radio-group` | — | `q-radio` / `q-option-group` |
| `isc-card` | `IscDataCard` (when applicable) | `q-card` |
| `isc-tag` | — | `q-chip` |
| `isc-search-counter` | — | `q-badge` |
| `isc-progress-circular` | `IscProgressBar` (when applicable) | `q-circular-progress` / `q-spinner` |
| `isc-progress-linear` | `IscProgressBar` | `q-linear-progress` |
| `isc-wizard` | — | `q-stepper` |
| `isc-notifications` | — | Quasar `Notify` plugin |
| `isc-forum-post` | — | `SquareUi/src/components/forum/` patterns |
| `conversation-editor` / `conversation-list` | `IscDiscussion` | `SquareUi/src/components/discussion/` |
| `isc-rich-input` | `IscRichTextEditor` | Tiptap / `q-editor` |

For per-tag HTML examples and Quasar fallback snippets, see `quasar-mappings.md`.

## Angular Service → Vue Module Patterns

**@api-first:** map Angular dataservice URLs to `InSites.Eco.Client.Vue/api/dist/services`, then call generated functions from the `.vue`, composable, or Pinia store. Use `@/services/http-service` only when no `@api` client exists. See `service-patterns.md` and `vue-templates/PiniaStore.ts`.

| AngularJS | Vue 3 |
|-----------|-------|
| `@Injectable()` / `$inject` | No decorators — plain module or Pinia store |
| `this.$http.get(url)` | Prefer `import { fn } from '@api/services/query/default/<Service>'`; **FALLBACK:** `get<T>(url)` from `@/services/http-service` |
| `this.$q.defer()` | `new Promise((resolve, reject) => ...)` |
| `const promise = service.method(); promise.$promise.then(...)` | `await service.method()` |
| `$resource.query(params)` | Prefer `@api` query client; **FALLBACK:** `get<T[]>(url, { params })` via http-service |
| `Upload.upload({ file })` | Prefer `@api` command client (e.g. `upload` helpers in `api/dist`); **FALLBACK:** `upload(url, file)` from http-service |
| `$timeout(fn, delay)` | `setTimeout(fn, delay)` |
| `$interval(fn, ms)` | `setInterval(fn, ms)` (or use `watch` with timestamps) |
| `$scope.$on('event', handler)` | Provide/Inject, composables, or Pinia subscriptions |

## Angular Material Directives

| Angular Material | Quasar Equivalent |
|-----------------|-------------------|
| `md-button` | `q-btn` |
| `md-input` / `md-input-container` | `q-input` |
| `md-select` | `q-select` |
| `md-checkbox` | `q-checkbox` |
| `md-radio` | `q-radio` |
| `md-switch` | `q-toggle` |
| `md-slider` | `q-slider` |
| `md-datepicker` | `q-date` |
| `md-autocomplete` | `q-select` with `use-input` + `@filter` |
| `md-chips` | `q-chip` with `q-input` |
| `md-tabs` | `q-tabs` / `q-route-tabs` |
| `md-toolbar` | `q-toolbar` / `q-header` |
| `md-sidenav` | `q-drawer` |
| `md-list` / `md-list-item` | `q-list` / `q-item` |
| `md-card` | `q-card` |
| `md-dialog` | Quasar `Dialog` plugin |
| `md-toast` / `md-snackbar` | Quasar `Notify` plugin |
| `md-tooltip` | `q-tooltip` |
| `md-menu` | `q-menu` |
| `md-progress-circular` | `q-circular-progress` / `q-spinner` |
| `md-progress-linear` | `q-linear-progress` |
| `md-content` | `q-page` or a plain `<div>` with padding |
| `md-whiteframe` | `q-card` with shadow |
| `md-virtual-repeat` | `q-virtual-scroll` or `v-for` |
| `md-table` | `q-table` |
| `md-grid-list` | CSS Grid or `q-layout` with custom CSS |

## RxJS → Vue Reactivity

| RxJS Pattern | Vue 3 Equivalent |
|-------------|------------------|
| `observable.subscribe(cb)` | `watchEffect(cb)` or `watch(source, cb)` |
| `observable.pipe(map, filter)` | `computed(() => ...)` |
| `Subject.next(value)` | `ref.value = value` or Pinia action |
| `BehaviorSubject` | `ref(value)` with default |
| `ReplaySubject` | Pinia store with action history |
| `Observable.fromEvent(element, event)` | `onMounted(() => element.addEventListener(...))` |
| `.pipe(takeUntil(destroy$))` | `onBeforeUnmount(() => cleanup)` |
| `.pipe(debounceTime(ms))` | Lodash `debounce` (already in project) |
| `.pipe(distinctUntilChanged())` | `watch(source, cb)` (naturally distinct per tick) |

## Angular Filters → Vue

Vue 3 has no filter syntax (`{{ value | filterName }}`). Replace each Angular filter as follows:

| AngularJS Filter | Vue 3 Equivalent |
|-----------------|------------------|
| `{{ date \| date:'short' }}` | `computed(() => DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_SHORT))` using Luxon |
| `{{ date \| date:'mediumDate' }}` | `computed(() => DateTime.fromISO(date).toLocaleString(DateTime.DATE_MED))` |
| `{{ date \| date:'yyyy-MM-dd' }}` | `computed(() => DateTime.fromISO(date).toFormat('yyyy-MM-dd'))` |
| `{{ value \| currency }}` | `computed(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value))` |
| `{{ value \| number:'1.2-2' }}` | `computed(() => value.toFixed(2))` |
| `{{ 'LabelKey' \| translate }}` | `getLabelValue('LabelKey', 'Fallback')` — see `references/i18n-patterns.md` |
| `{{ text \| uppercase }}` | `computed(() => text.toUpperCase())` or `:class="'text-uppercase'"` in Quasar |
| `{{ text \| lowercase }}` | `computed(() => text.toLowerCase())` |
| `{{ text \| limitTo:n }}` | `computed(() => text.slice(0, n))` |
| `ng-repeat="item in items \| filter:query"` | `const filtered = computed(() => items.filter(i => i.name.includes(query.value)))` |
| `ng-repeat="item in items \| orderBy:'name'"` | `const sorted = computed(() => [...items].sort((a, b) => a.name.localeCompare(b.name)))` |
| Custom filter `myFilter` | Plain function or `computed()` — no registration needed |

**Rule:** every Angular filter becomes either a `computed` property, a plain function call, or an import from Luxon/Lodash. Never recreate a filter registry.

### Programmatic `$filter` in controllers

Angular controllers sometimes inject `$filter` and call it directly in JS code:

```ts
// Angular controller
static $inject = ['$filter'];
constructor(private $filter: ng.IFilterService) {}

$onInit() {
  this.formattedDate = this.$filter('date')(this.createdAt, 'mediumDate');
  this.label = this.$filter('translate')('LabelKey');
  this.sorted = this.$filter('orderBy')(this.items, 'name');
}
```

Migrate each call to the same Vue equivalent as the template filter:

| `$filter(...)` call | Vue equivalent |
|---------------------|----------------|
| `this.$filter('date')(value, 'mediumDate')` | `DateTime.fromISO(value).toLocaleString(DateTime.DATE_MED)` |
| `this.$filter('date')(value, 'yyyy-MM-dd')` | `DateTime.fromISO(value).toFormat('yyyy-MM-dd')` |
| `this.$filter('translate')('LabelKey')` | `getLabelValue('LabelKey', 'Fallback')` |
| `this.$filter('currency')(value)` | `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)` |
| `this.$filter('orderBy')(items, 'prop')` | `[...items].sort((a, b) => a.prop.localeCompare(b.prop))` |
| `this.$filter('filter')(items, query)` | `items.filter(i => ...)` |
| `this.$filter('limitTo')(items, n)` | `items.slice(0, n)` |
| `this.$filter('myCustomFilter')(value, arg)` | call the migrated plain function directly |

Remove `$filter` from `$inject` entirely — it has no Vue equivalent.

## Transclusion → Slots

| AngularJS Pattern | Vue 3 Equivalent |
|-------------------|-----------------|
| `transclude: true` in component | `<slot />` in template |
| `<my-component>content</my-component>` (host) | `<MyComponent>content</MyComponent>` — same |
| `<ng-transclude></ng-transclude>` | `<slot />` |
| `transclude: { header: '?headerSlot', body: '?bodySlot' }` | Named slots: `<slot name="header" />` + `<slot name="body" />` |
| `<ng-transclude ng-transclude-slot="header">` | `<template #header>...</template>` at the call site |
| `$transclude(scope, clone => ...)` | Not needed — Vue slots are reactive |
| Quasar `#label` slot | `<template #label>{{ getLabelValue(...) }}</template>` |
| Quasar `#error` slot | `<template #error><span>{{ v$.field.$errors[0]?.$message }}</span></template>` |
| Quasar `#append` slot | `<template #append><q-icon name="..." /></template>` |
| Quasar `#hint` slot | `<template #hint>{{ getLabelValue('LabelHint', 'Help text') }}</template>` |

**Scoped slots** — when Angular transclusion passes data to the transcluded content:
```vue
<!-- Component definition -->
<slot :item="currentItem" />

<!-- Call site -->
<MyComponent v-slot="{ item }">
  {{ item.name }}
</MyComponent>
```

## Angular FormController → Vuelidate

See `references/form-validation-patterns.md` for the full guide. Quick reference:

| AngularJS FormController | Vuelidate Equivalent |
|--------------------------|----------------------|
| `form.$valid` | `!v$.$invalid` |
| `form.$invalid` | `v$.$invalid` |
| `form.$dirty` | `v$.$anyDirty` |
| `form.$pristine` | `!v$.$anyDirty` |
| `form.$setPristine()` | `v$.$reset()` |
| `ngModel.$dirty` | `v$.field.$dirty` |
| `ngModel.$error.required` | `v$.field.required.$invalid` |
| `ngModel.$setValidity('key', false)` | Push to `serverErrors.value[field]` |
| `ng-messages` / `ng-message` | `:error-message="v$.field.$errors[0]?.$message"` on `q-input` |
