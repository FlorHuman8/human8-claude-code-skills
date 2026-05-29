# Common Pitfalls in AngularJS → Vue Migration

## 1. CSS Conflicts Between Angular Material and Quasar

Angular Material and Quasar both define global CSS classes that conflict. The project handles this with CSS resets in `angular-component-wrapper.vue` for the hybrid phase. For fully migrated pages, be aware of:

### Flex class conflicts
Both Angular Material (`.layout-row`, `.layout-column`, `.flex`) and Quasar (`.row`, `.column`, `.flex`) define flex utilities with different behavior. Quasar's flex uses `flex-wrap: wrap` by default, while Angular Material uses `flex-wrap: nowrap`. When migrating, explicitly set `flex-wrap` if needed.

### Disabled element opacity
Quasar adds `opacity` to `[disabled]` elements. Angular Material does not. When converting:
- Remove the Angular override or
- Use `q-btn disable` prop instead of native `disabled` attribute

### Cursor behavior
Quasar sets `cursor: default` on `[aria-disabled]`. This can conflict with Angular Material components during hybrid phase. Only relevant when using `angular-component-wrapper.vue`.

### Reset pattern (for reference)
When embedding Angular in Vue (via the wrapper), these resets are needed:
```scss
[id='maincontent'] {
  h1, h2, h3, h4, h5, h6 {
    font-size: revert;
    font-weight: revert;
    line-height: revert;
    letter-spacing: revert;
  }
  .row, .column, .flex {
    flex-wrap: unset;
  }
  .layout-row, .layout-column {
    display: flex;
  }
  [disabled] {
    opacity: unset !important;
    cursor: auto !important;
  }
}
```

## 2. Reactivity Gotchas

### Direct property assignment
```ts
// WRONG — not reactive:
state.items = response.data;

// RIGHT — must use ref or reactive:
const items = ref<Item[]>([]);
items.value = response.data;

// Or with Pinia:
this.items = response.data; // Pinia handles this
```

### Nested reactivity
```ts
// WRONG — reactive proxy lost:
const state = reactive({ user: { name: 'John' } });
const userName = state.user.name; // Not reactive to future changes

// RIGHT — computed:
const state = reactive({ user: { name: 'John' } });
const userName = computed(() => state.user.name);
```

### Array mutations
```ts
// AngularJS would detect these, Vue 3 does too (Proxies):
items.value.push(newItem);
items.value.splice(index, 1);

// But direct index assignment needs .value access:
items.value[index] = updatedItem; // Works with ref/reactive
```

## 3. Async Patterns

### Promise chains vs async/await
```ts
// AngularJS style (avoid in Vue):
this.$q.all([service1(), service2()])
  .then(([r1, r2]) => {
    this.data1 = r1.data;
    this.data2 = r2.data;
  })
  .finally(() => {
    this.loading = false;
  });

// Vue style (prefer):
const [result1, result2] = await Promise.all([service1(), service2()]);
data1.value = result1;
data2.value = result2;
loading.value = false;
```

### Lifecycle race conditions
AngularJS `$onInit` runs synchronously after bindings are set. Vue `onMounted` runs after the component is mounted. If you need data before render, use `onBeforeMount`:

```ts
onBeforeMount(async () => {
  await loadData();
});
// Template uses data immediately — works because await delays first render
```

## 4. Template Expressions

### Angular allows complex expressions in templates
```html
<!-- Angular — allowed but don't port directly -->
<div>{{ vm.items.filter(x => x.active).map(x => x.name).join(', ') }}</div>

<!-- Vue — move to computed -->
<script setup>
const activeNames = computed(() =>
  items.value.filter(x => x.active).map(x => x.name).join(', ')
);
</script>
<template>
  <div>{{ activeNames }}</div>
</template>
```

### Attribute bindings
```html
<!-- Angular — string interpolation in attributes -->
<div ng-class="'col-' + vm.size + '-' + vm.columns"></div>

<!-- Vue — dynamic binding -->
<div :class="`col-${size}-${columns}`"></div>
```

## 5. Form Handling

AngularJS uses `ng-model` for two-way binding and `ng-messages` for validation. Vue uses `v-model` with Vuelidate.

```vue
<script setup lang="ts">
import { useVuelidate } from '@vuelidate/core';
import { required, email } from '@vuelidate/validators';

const state = reactive({
  name: '',
  email: '',
});

const rules = {
  name: { required },
  email: { required, email },
};

const v$ = useVuelidate(rules, state);
</script>

<template>
  <q-input
    v-model="state.name"
    label="Name"
    :error="v$.name.$error"
    :error-message="v$.name.$errors[0]?.$message"
    @blur="v$.name.$touch"
  />
</template>
```

## 6. RxJS Subscriptions

AngularJS often uses RxJS `Subject` for event buses. In Vue, replace with:

```ts
// Option 1: Pinia actions (preferred for shared state)
const store = useNotificationStore();
store.notify('event');

// Option 2: Provide/Inject for parent-child
provide('eventBus', {
  emit: (event: string, data: any) => { /* ... */ },
});

// Option 3: Component events
watch(someReactiveSource, (newVal) => {
  // Reactive to changes like an RxJS subscription
});
```

## 7. $scope.$watch Cleanup

AngularJS requires manual cleanup of `$scope.$watch` (returns a deregister function). In Vue, `watch` and `watchEffect` are automatically cleaned up on unmount when called in `<script setup>`.

```ts
// Auto-cleaned when component unmounts:
watch(source, (newVal) => {
  console.log('changed', newVal);
});
```

## 8. Angular Filters

AngularJS filters (`{{ value | filterName }}`) have no Vue equivalent — Vue 3 removed the filter syntax entirely. Replace each one:

### Date filters → Luxon
```ts
// Angular: {{ vm.createdAt | date:'mediumDate' }}
import { DateTime } from 'luxon';
const formattedDate = computed(() =>
  DateTime.fromISO(createdAt.value).toLocaleString(DateTime.DATE_MED)
);

// Angular: {{ vm.createdAt | date:'yyyy-MM-dd HH:mm' }}
const formattedDate = computed(() =>
  DateTime.fromISO(createdAt.value).toFormat('yyyy-MM-dd HH:mm')
);
```

### Translate filter → getLabelValue
```ts
// Angular template: {{ 'LabelSave' | translate }}
// Vue template:     {{ getLabelValue('LabelSave', 'Save') }}

// Angular: {{ 'LabelKey' | translate:{ name: vm.name } }}
// Vue — compute it:
const message = computed(() =>
  `${getLabelValue('LabelWelcome', 'Welcome')}, ${name.value}!`
);
```
See `references/i18n-patterns.md` for the full label service guide.

### List filters → computed properties
```ts
// Angular: ng-repeat="item in vm.items | filter:vm.query"
const filtered = computed(() =>
  items.value.filter(i => i.name.toLowerCase().includes(query.value.toLowerCase()))
);

// Angular: ng-repeat="item in vm.items | orderBy:'name'"
const sorted = computed(() =>
  [...items.value].sort((a, b) => a.name.localeCompare(b.name))
);

// Angular: ng-repeat="item in vm.items | limitTo:5"
const limited = computed(() => items.value.slice(0, 5));
```

### Currency / number → Intl or toFixed
```ts
// Angular: {{ vm.price | currency }}
const formattedPrice = computed(() =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price.value)
);

// Angular: {{ vm.ratio | number:'1.2-2' }}
const formattedRatio = computed(() => ratio.value.toFixed(2));
```

### Custom filters → plain functions
```ts
// Angular: {{ vm.text | myCustomFilter:arg }}
// Vue — call directly in template:
function myCustomFilter(text: string, arg: string): string {
  return text.replace(arg, '');
}
// In template: {{ myCustomFilter(text, arg) }}
```

### `$filter` injected in controllers

A less obvious form: `$filter` injected as a dependency and called programmatically in controller JS, not the template. Easy to miss when reading the `$inject` list.

```ts
// Angular — $filter used in controller code
static $inject = ['$filter'];
constructor(private $filter: ng.IFilterService) {}

$onInit() {
  this.label = this.$filter('translate')('LabelKey');
  this.formatted = this.$filter('date')(this.createdAt, 'mediumDate');
  this.sorted = this.$filter('orderBy')(this.items, 'name');
}
```

```ts
// Vue — replace each call at the point of use, drop $filter from imports
import { DateTime } from 'luxon';
import { useConstantsStore } from '@/store/constants-store';

const getLabelValue = useConstantsStore().getLabelValue;

onMounted(() => {
  label.value = getLabelValue('LabelKey', 'Fallback');
  formatted.value = DateTime.fromISO(createdAt.value).toLocaleString(DateTime.DATE_MED);
  sorted.value = [...items.value].sort((a, b) => a.name.localeCompare(b.name));
});
```

Remove `'$filter'` from `$inject` and the constructor parameter entirely.

## 9. Event Buses

AngularJS `$broadcast` / `$emit` / `$on` patterns should be replaced with:
- **Pinia stores** for app-wide events (preferred)
- **Provide/Inject** for parent-child communication
- **Composables** for reusable logic with shared state

## 10. File Organization Differences

| Aspect | AngularJS | Vue 3 |
|--------|-----------|-------|
| Files per component | 3-4 files (controller, component, html, scss) | 1 `.vue` file |
| Service location | `src/app/core/services/` | `src/services/` |
| Store location | N/A (services held state) | `src/store/` |
| Route config | In state files, `$stateProvider` | `src/router/routes/*.ts` |
| Constants | `module.constant('name', value)` | `src/common/constants/` or env config |
| Tests | N/A (no existing tests) | Co-located `.spec.ts` |

## 11. Slot / Transclusion Migration

AngularJS `ng-transclude` maps to Vue `<slot>`. A common mistake is forgetting to convert transcluded content entirely, leaving elements without a slot outlet.

### Default transclusion → default slot
```html
<!-- Angular component template -->
<div class="isc-card">
  <ng-transclude></ng-transclude>
</div>

<!-- Vue component template -->
<div class="isc-card">
  <slot />
</div>
```

### Named transclusion → named slots

```ts
// Angular component definition
{
  transclude: {
    header: '?headerSlot',
    body: '?bodySlot',
  }
}
```

```html
<!-- Angular component template -->
<div class="panel">
  <div class="panel__header">
    <ng-transclude ng-transclude-slot="header"></ng-transclude>
  </div>
  <div class="panel__body">
    <ng-transclude ng-transclude-slot="body"></ng-transclude>
  </div>
</div>

<!-- Vue component template -->
<div class="panel">
  <div class="panel__header">
    <slot name="header" />
  </div>
  <div class="panel__body">
    <slot name="body" />
  </div>
</div>
```

```html
<!-- Call site: Angular -->
<my-panel>
  <div ng-transclude-slot="header">Title</div>
  <div ng-transclude-slot="body">Content</div>
</my-panel>

<!-- Call site: Vue -->
<MyPanel>
  <template #header>Title</template>
  <template #body>Content</template>
</MyPanel>
```

### Quasar named slots (frequently used in this project)

Quasar components expose named slots for customizing labels, error messages, and icons inside inputs. These replace Angular's per-component attribute/binding approach:

```vue
<q-input v-model="email" :error="v$.email.$error">
  <template #label>
    <div class="form__label text-body2">
      {{ getLabelValue('LabelEmail', 'Email address') }}*
    </div>
  </template>
  <template #error>
    <span class="form__error text-caption">
      {{ v$.email.$errors[0]?.$message }}
    </span>
  </template>
  <template #append>
    <q-icon name="email" />
  </template>
</q-input>
```

Common Quasar input slots: `#label`, `#error`, `#hint`, `#prepend`, `#append`, `#before`, `#after`, `#counter`.
