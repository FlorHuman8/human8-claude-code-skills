# i18n / Label Translation Patterns

## Overview

The InSites.Eco Vue project does **not** use vue-i18n. Labels are fetched from the server and accessed via a custom `getLabelValue` helper backed by a Pinia store.

## Import Paths

**In MemberPortal components (pages, components):**
```ts
import { useConstantsStore } from '@/store/constants-store';

const getLabelValue = useConstantsStore().getLabelValue;
```

**In SquareUi components:**
```ts
import { getLabelValue } from '@ui/services/label-service';
```

Use the MemberPortal pattern for all migrated page/component files. Use the SquareUi pattern only when creating shared SquareUi components.

## API

```ts
getLabelValue(labelKey: string, fallback: string): string
```

- `labelKey` — the server-side label identifier (e.g. `'LabelSaveChanges'`)
- `fallback` — a human-readable English string returned when the label is not yet loaded or not found

**Always provide a meaningful fallback.** Never pass an empty string. This ensures the UI is usable before labels arrive from the server and keeps tests predictable without needing to mock the label store.

## Angular → Vue Translation Mapping

| AngularJS Pattern | Vue 3 Pattern |
|-------------------|---------------|
| `{{ 'LabelKey' \| translate }}` | `{{ getLabelValue('LabelKey', 'Fallback text') }}` |
| `$translate.instant('LabelKey')` | `getLabelValue('LabelKey', 'Fallback text')` |
| `$translate.instant('LabelKey', { param: value })` | Template literal: `` `${getLabelValue('LabelKey', 'Fallback')} ${value}` `` |
| `{{ 'LabelKey' \| translate:{ count: n } }}` | Compute plural form with a conditional expression |
| `:aria-label="'LabelKey' \| translate"` | `:aria-label="getLabelValue('LabelKey', 'Fallback')"` |
| `[title]="'LabelKey' \| translate"` | `:title="getLabelValue('LabelKey', 'Fallback')"` |
| `$translate.instant` in a service/factory | `getLabelValue` imported from `@ui/services/label-service` |

## Template Usage

```vue
<script setup lang="ts">
import { useConstantsStore } from '@/store/constants-store';
const getLabelValue = useConstantsStore().getLabelValue;
</script>

<template>
  <q-btn :label="getLabelValue('LabelSave', 'Save')" color="primary" />

  <q-input
    :label="getLabelValue('LabelFirstName', 'First name')"
    v-model="firstName"
  />

  <p>{{ getLabelValue('LabelWelcomeMessage', 'Welcome to the platform') }}</p>
</template>
```

## Usage Inside Vuelidate Rules

Combine with `helpers.withMessage` from `@vuelidate/validators`:

```ts
import { useVuelidate } from '@vuelidate/core';
import { required, minLength } from '@vuelidate/validators';
import { helpers } from '@vuelidate/validators';
import { useConstantsStore } from '@/store/constants-store';

const getLabelValue = useConstantsStore().getLabelValue;

const rules = {
  username: {
    required: helpers.withMessage(
      getLabelValue('LabelUsernameRequired', 'A username is required'),
      required,
    ),
    minLength: helpers.withMessage(
      getLabelValue('LabelUsernameTooShort', 'Username must be at least 3 characters'),
      minLength(3),
    ),
  },
};
```

See `references/form-validation-patterns.md` for the full Vuelidate integration.

## Interpolation

Angular's `$translate` supports named interpolation (`{{ 'key' | translate:{ name: vm.name } }}`). In Vue, replace with a computed property or inline template literal:

```ts
// Angular: {{ 'LabelWelcome' | translate:{ name: vm.displayName } }}
// Vue:
const welcomeMessage = computed(
  () => `${getLabelValue('LabelWelcome', 'Welcome')}, ${displayName.value}!`
);
```
