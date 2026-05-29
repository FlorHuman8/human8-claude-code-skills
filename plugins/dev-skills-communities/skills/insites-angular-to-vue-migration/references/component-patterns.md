# Vue Component Pattern Reference

Based on existing components in `InSites.Eco.Client.Vue/MemberPortal/src/pages/` and `SquareUi/src/components/`.

## File Structure

All components follow this structure:
```vue
<script setup lang="ts">
// Imports
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useStore } from '@/store/some-store';
import IscWrapperPage from '@ui/components/wrapper-page/isc-wrapper-page.vue';
import { someService } from '@/services/some-service';

// Props
const props = defineProps<{
  someProp: string;
  optionalProp?: number;
}>();

// Emits
const emit = defineEmits<{
  update: [value: string];
  action: [id: number];
}>();

// Route
const route = useRoute();
const router = useRouter();
const pageGuid = computed(() => route.params.pageGuid as string);

// Store
const store = useStore();
const storeValue = computed(() => store.someValue);

// Local state
const localRef = ref<string>('');
const localComputed = computed(() => localRef.value.toUpperCase());

// Lifecycle
onMounted(async () => {
  await store.init();
});
</script>

<template>
  <div class="my-component">
    <q-btn
      label="Click me"
      @click="handleClick"
    />
    <p>{{ localComputed }}</p>
  </div>
</template>

<!-- Never use scoped on migrated components -->
<style lang="scss">
.my-component {
  padding: 16px;
}
</style>
```

## Key Conventions

1. **`<script setup lang="ts">`** — Always. No Options API.
2. **Props** — Typed via `defineProps<Type>()` or `withDefaults(defineProps<Props>(), { optional: defaultValue })`.
3. **Emits** — Typed via `defineEmits<{ eventName: [payloadType] }>()`.
4. **Route params** — Access via `const route = useRoute()` and `computed()`.
5. **Router navigation** — `const router = useRouter()` with `router.push()`.
6. **State management** — Pinia stores via `useXxxStore()`.
7. **`@ui` components** — Prefer existing `Isc*` exports from `@ui/components` (see `SquareUi/src/components/index.ts`) before raw Quasar `q-*`.
8. **Quasar** — Use `q-*` only when no matching `@ui` component exists.
9. **MemberPortal components** — `@/components/` for app-specific pieces.
10. **Styling** — `lang="scss"` without `scoped` — never use the `scoped` attribute. BEM-like naming conventions.
10. **Async** — `async/await` preferred over `.then()`.

## Example: Minimal Page Component

```vue
<script setup lang="ts">
import { useMeta } from 'quasar';
import { computed } from 'vue';

const pageTitle = 'Dashboard';
useMeta({ title: pageTitle });
</script>

<template>
  <q-page class="dashboard-page">
    <h1>Dashboard</h1>
  </q-page>
</template>

<style lang="scss">
.dashboard-page {
  padding: 24px;
}
</style>
```

## Example: Component with Props and Events

```vue
<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: string;
  label?: string;
  disabled?: boolean;
}>(), {
  label: 'Input',
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

function onInput(value: string) {
  emit('update:modelValue', value);
}
</script>

<template>
  <q-input
    :model-value="modelValue"
    :label="label"
    :disable="disabled"
    @update:model-value="onInput"
  />
</template>
```

## Example: Component with Slots (from SquareUi)

```vue
<script setup lang="ts">
withDefaults(defineProps<{
  caption?: string;
  first?: boolean;
  last?: boolean;
  done?: boolean;
  editable?: boolean;
  error?: string;
  icon?: string;
}>(), {
  caption: '',
  first: false,
  last: false,
  done: false,
  editable: true,
  icon: '',
  error: '',
});
</script>

<template>
  <div class="isc-wrapper-page">
    <slot />
  </div>
</template>
```
