# Form Validation Patterns (Vuelidate)

The project uses `@vuelidate/core` + `@vuelidate/validators`. This reference covers the actual patterns used in MemberPortal — not just the basic API.

## Basic Setup

```ts
import { ref } from 'vue';
import { useVuelidate } from '@vuelidate/core';
import { required, email, minLength, maxLength } from '@vuelidate/validators';
import { helpers } from '@vuelidate/validators';
import { useConstantsStore } from '@/store/constants-store';

const getLabelValue = useConstantsStore().getLabelValue;

// Use individual refs for each field (preferred in this project)
const firstName = ref('');
const emailField = ref('');

const rules = {
  firstName: {
    required: helpers.withMessage(
      getLabelValue('LabelFirstNameRequired', 'First name is required'),
      required,
    ),
    maxLength: helpers.withMessage(
      getLabelValue('LabelFirstNameTooLong', 'First name is too long'),
      maxLength(100),
    ),
  },
  emailField: {
    required: helpers.withMessage(
      getLabelValue('LabelEmailRequired', 'Email is required'),
      required,
    ),
    email: helpers.withMessage(
      getLabelValue('LabelEmailInvalid', 'Please enter a valid email address'),
      email,
    ),
  },
};

const v$ = useVuelidate(rules, { firstName, emailField });
```

## Wiring to q-input

```vue
<q-input
  v-model="firstName"
  :label="getLabelValue('LabelFirstName', 'First name')"
  :error="v$.firstName.$error"
  :error-message="v$.firstName.$errors[0]?.$message"
  @blur="v$.firstName.$touch"
/>
```

## Async Validators

For validators that need to call the server (e.g. checking if a domain is SSO-only):

```ts
import { helpers } from '@vuelidate/validators';

async function validateSsoDomain(value: string): Promise<boolean> {
  if (!value) return true;
  const result = await checkSsoDomain(value);
  return !result.isSso;
}

const rules = {
  email: {
    noSsoDomain: helpers.withMessage(
      getLabelValue('LabelEmailCannotUseSso', 'SSO accounts cannot reset password here'),
      helpers.withAsync(validateSsoDomain),
    ),
  },
};
```

## Server Error Integration

After form submission, merge server-side validation errors back into Vuelidate state:

```ts
import { ref } from 'vue';
import { forEach } from 'lodash-es';
import { helpers } from '@vuelidate/validators';

const serverErrors = ref<Record<string, string[]>>({});

function createServerErrorFor(field: string) {
  return helpers.withMessage(
    () => serverErrors.value[field]?.[0] ?? '',
    () => !serverErrors.value[field]?.length,
  );
}

const rules = {
  firstName: {
    required: helpers.withMessage(getLabelValue('LabelFirstNameRequired', 'Required'), required),
    serverError: createServerErrorFor('firstName'),
  },
};

const v$ = useVuelidate(rules, { firstName });

async function onSubmit() {
  const isValid = await v$.value.$validate();
  if (!isValid) return;

  try {
    await saveProfile({ firstName: firstName.value });
  } catch (err) {
    // Server returns errors grouped by field name
    const grouped = (err as any).response?.data?.errors ?? {};
    forEach(grouped, (messages: { errorMessage: string }[], field: string) => {
      serverErrors.value[field] = messages.map(m => m.errorMessage);
      // Touch the field so the error displays immediately
      const isKeyOf$v = (key: string): key is keyof typeof v$.value => key in v$.value;
      if (isKeyOf$v(field)) {
        const fieldValidator = v$.value[field];
        if (typeof fieldValidator === 'object' && '$touch' in fieldValidator) {
          (fieldValidator as { $touch(): void }).$touch();
        }
      }
    });
  }
}

// Clear server errors when the user edits a field
watch(firstName, () => {
  delete serverErrors.value['firstName'];
});
```

## Form State Properties

| Property | Type | Description | Example Use |
|----------|------|-------------|-------------|
| `v$.$invalid` | `boolean` | Any rule fails | `:disable="v$.$invalid"` |
| `v$.$anyDirty` | `boolean` | Any field has been touched | `:disable="!v$.$anyDirty"` |
| `v$.[field].$error` | `boolean` | Field is dirty AND has errors | `:error="v$.name.$error"` |
| `v$.[field].$dirty` | `boolean` | Field has been touched | `v-if="v$.email.$dirty"` |
| `v$.[field].$errors` | `ErrorObject[]` | Array of error objects | `v$.name.$errors[0]?.$message` |
| `v$.[field].$touch()` | `void` | Mark field as touched (triggers validation) | `@blur="v$.name.$touch"` |
| `v$.$validate()` | `Promise<boolean>` | Run all validators | `await v$.value.$validate()` |
| `v$.$reset()` | `void` | Reset dirty/error state | On form cancel |

## Angular FormController → Vuelidate Equivalents

| AngularJS FormController | Vuelidate Equivalent |
|--------------------------|----------------------|
| `form.$valid` | `!v$.$invalid` |
| `form.$invalid` | `v$.$invalid` |
| `form.$dirty` | `v$.$anyDirty` |
| `form.$pristine` | `!v$.$anyDirty` |
| `form.$submitted` | Manual `const hasSubmitted = ref(false)` |
| `form.$setPristine()` | `v$.$reset()` |
| `form.$setUntouched()` | `v$.$reset()` |
| `ngModel.$modelValue` | `fieldRef.value` |
| `ngModel.$dirty` | `v$.field.$dirty` |
| `ngModel.$invalid` | `v$.field.$invalid` |
| `ngModel.$error.required` | `v$.field.required.$invalid` |
| `ngModel.$setValidity('key', false)` | Push to `serverErrors.value[field]` |
| `ng-valid` / `ng-invalid` CSS classes | `:class="{ 'field--invalid': v$.field.$error }"` |
| `ng-messages` block | `:error-message` prop on `q-input` |
| `ng-message="required"` | `v$.field.$errors[0]?.$message` |

## Custom Validator Factories

```ts
function createMaxLengthErrorFor(labelKey: string, fieldName: string, limit: number) {
  return helpers.withMessage(
    getLabelValue(labelKey, `${fieldName} cannot exceed ${limit} characters`),
    maxLength(limit),
  );
}

const aboutMaxLength = 500;
const rules = {
  about: {
    maxLength: createMaxLengthErrorFor('LabelAboutTooLong', 'About', aboutMaxLength),
    serverError: createServerErrorFor('about'),
  },
};
```

## Disable Submit Button Pattern

```vue
<q-btn
  type="submit"
  :disable="v$.$invalid || !v$.$anyDirty"
  :class="v$.$invalid || !v$.$anyDirty
    ? 'bg-insites-button-disabled text-on-surface-disabled'
    : 'bg-primary text-white'"
  :label="getLabelValue('LabelSaveChanges', 'Save changes')"
  unelevated
/>
```
