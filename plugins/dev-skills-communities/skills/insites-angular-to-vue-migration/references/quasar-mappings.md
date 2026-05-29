# UI mappings — Quasar fallbacks

Use this file **after** checking `@ui` — not as the first mapping step. Tables and examples below apply only when **step 3** of the resolution order finds no matching `Isc*` export in SquareUi.

## Component resolution order

1. Search `InSites.Eco.Client.Vue/SquareUi/src/components/index.ts` for an existing `Isc*` Vue export matching the Angular tag (e.g. `isc-pagination` → `IscPagination`, `isc-email` → `IscEmail`).
2. Import from `@ui/components` or `@ui/components/<path>/isc-*.vue`.
3. Only if no `@ui` match: use the Quasar fallbacks in this document.
4. If neither fits: escalate per `SKILL.md` Step 4 (custom SquareUi component or ask the user).

## Tag lookup table

Use the **canonical** `@ui` / Quasar columns in [`angular-to-vue-mappings.md`](angular-to-vue-mappings.md) (section “isc-ui → @ui (preferred) / Quasar (fallback)”). This file adds per-category HTML mappings and **Quasar fallback code examples** only.

---

## Button (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `<isc-button type="primary" label="Save">` | — | `<q-btn color="primary" label="Save">` |
| `<isc-button flat>` | — | `<q-btn flat>` |
| `<isc-button icon="close">` | — | `<q-btn icon="close">` |
| `<isc-button disabled>` | — | `<q-btn disable>` |
| `<isc-button size="small">` | — | `<q-btn size="sm">` |
| `<isc-save-button>` | — | `<q-btn color="primary" icon="save">` |
| `<md-button class="md-raised">` | — | `<q-btn unelevated>` |
| `<md-button class="md-icon-button">` | — | `<q-btn icon="..." flat round>` |
| `<isc-radio-group>` | — | `<q-option-group type="radio">` |
| `<isc-radio-button>` | — | `<q-radio>` |

## Input (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `<isc-input model="vm.value" label="Name">` | — | `<q-input v-model="value" label="Name">` |
| `<isc-input required>` | — | `<q-input :rules="[val => !!val \|\| 'Required']">` |
| `<isc-input type="email">` | `IscEmail` | `<q-input type="email">` |
| `<isc-textarea>` | — | `<q-input type="textarea" v-model="value">` |
| `<isc-dropdown items="vm.list">` | `IscGroupedDropdown` when grouped | `<q-select :options="list" v-model="value">` |

## Toggle / selection (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `<isc-checkbox model="vm.checked">` | — | `<q-checkbox v-model="checked">` |
| `<isc-switch model="vm.on">` | — | `<q-toggle v-model="on">` |
| `<md-checkbox>` | — | `<q-checkbox>` |
| `<md-switch>` | — | `<q-toggle>` |

## Display (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `<isc-tag text="Label">` | — | `<q-chip label="Label">` |
| `<isc-card>` | `IscDataCard` when applicable | `<q-card>` with `<q-card-section>` |
| `<isc-banner>` | — | `<q-banner>` |
| `<isc-search-counter count="5">` | — | `<q-badge color="primary">5</q-badge>` |
| `<isc-progress-circular>` | `IscProgressBar` when applicable | `<q-circular-progress :value="percent">` / `<q-spinner>` |
| `<isc-progress-linear>` | `IscProgressBar` | `<q-linear-progress :value="percent">` |

## Modal / dialog

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `isc-modal-dialog` / `md-dialog` | `IscDialog` from `@ui/components` | `$q.dialog()` |

**Quasar fallback example** — use only when `IscDialog` does not fit:

```ts
import { useQuasar } from 'quasar';
const $q = useQuasar();

$q.dialog({
  title: 'Confirm',
  message: 'Are you sure?',
  cancel: true,
  persistent: true,
}).onOk(() => {
  // confirmed
}).onCancel(() => {
  // cancelled
});
```

## Wizard / stepper (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `isc-wizard` | — | `q-stepper` |

**Quasar fallback example:**

```vue
<q-stepper
  v-model="step"
  ref="stepper"
  color="primary"
  animated
>
  <q-step
    :name="1"
    title="Step 1"
    icon="settings"
    :done="step > 1"
  >
    Step 1 content
  </q-step>

  <q-step
    :name="2"
    title="Step 2"
    icon="create"
    :done="step > 2"
  >
    Step 2 content
  </q-step>

  <template #navigation>
    <q-stepper-navigation>
      <q-btn
        @click="$refs.stepper.previous()"
        label="Back"
        flat
        :disable="step === 1"
      />
      <q-btn
        @click="$refs.stepper.next()"
        label="Next"
        color="primary"
        :disable="step === 2"
      />
    </q-stepper-navigation>
  </template>
</q-stepper>
```

## Table (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `isc-table-container` / `md-table` | — | `q-table` |

**Quasar fallback example:**

```vue
<q-table
  :rows="rows"
  :columns="columns"
  row-key="id"
  :filter="filter"
  :loading="loading"
  binary-state-sort
  @request="onRequest"
  :pagination="pagination"
>
  <template #top>
    <q-input v-model="filter" placeholder="Search" />
  </template>
</q-table>
```

## Pagination

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `isc-pagination` | `IscPagination` | `q-pagination` |

**Quasar fallback example** — use only when `IscPagination` does not fit:

```vue
<q-pagination
  v-model="currentPage"
  :max="totalPages"
  :direction-links="true"
  :boundary-links="true"
  @update:model-value="onPageChange"
/>
```

## Notifications (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `isc-notifications` | — | `$q.notify()` |

**Quasar fallback example:**

```ts
import { useQuasar } from 'quasar';
const $q = useQuasar();

$q.notify({
  type: 'positive',
  message: 'Saved!',
  position: 'bottom-right',
  timeout: 3000,
});
```

Check the current Quasar version at `quasarUserOptions` config for notification defaults.

## Carousel (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `isc-carousel` | — | `q-carousel` |

**Quasar fallback example:**

```vue
<q-carousel
  v-model="slide"
  animated
  arrows
  navigation
  infinite
>
  <q-carousel-slide
    v-for="(item, i) in items"
    :key="i"
    :name="i"
    :img-src="item.image"
  />
</q-carousel>
```

## Color picker (no @ui match)

| Angular | @ui | Quasar fallback |
|---------|-----|-----------------|
| `isc-color-picker` | — | `<input type="color">` or new `Isc*` in SquareUi |

No direct Quasar equivalent for a rich picker. Prompt the user if advanced color UI is required.

---

## Layout

Prefer **`IscWrapperPage`** from `@ui/components` for page shells before building raw `q-layout`.

| Angular Material | @ui | Quasar fallback |
|-----------------|-----|-----------------|
| Page shell / wrapper | `IscWrapperPage` | `q-layout` (see example below) |
| `<md-toolbar>` | — | `<q-toolbar>` inside `<q-header>` |
| `<md-sidenav>` | — | `<q-drawer>` |
| `<md-content>` | — | `<q-page>` |
| `<md-tabs>` | `IscTabbedRouter` when applicable | `<q-tabs>` / `<q-route-tabs>` |
| `<md-list>` / `<md-list-item>` | — | `<q-list>` / `<q-item>` |
| `<md-menu>` | — | `<q-menu>` |
| `<md-tooltip>` | — | `<q-tooltip>` |

**Quasar fallback example** — full layout when no `@ui` wrapper fits:

```vue
<q-layout view="hHh LpR fFf">
  <q-header elevated class="bg-primary text-white">
    <q-toolbar>
      <q-btn dense flat round icon="menu" @click="drawer = !drawer" />
      <q-toolbar-title>Page Title</q-toolbar-title>
    </q-toolbar>
  </q-header>

  <q-drawer v-model="drawer" show-if-above side="left" bordered>
    <!-- sidebar content -->
  </q-drawer>

  <q-page-container>
    <router-view />
  </q-page-container>
</q-layout>
```

---

## SquareUi components (use @ui — do not default to Quasar)

Grep `SquareUi/src/components/index.ts` before reading fallbacks above.

| Angular / legacy tag | @ui / location |
|--------------------|----------------|
| `media-recorder` | Search `SquareUi/src/components/` |
| `stimuli` / `stimuli-preview` | Search stimuli-related `isc-*` under SquareUi |
| `conversation-editor` / `conversation-list` | `IscDiscussion`, `discussion/` |
| `isc-forum-post` | `forum/` |
| `isc-rich-input` | `IscRichTextEditor` |
| `isc-input-button` | Often `q-input` + `append` slot + `q-btn` if no `Isc*` |
| `isc-upload-*`, thumbnails | `IscUploadAttachment`, `IscUploadThumbnail`, etc. |

## Scaffold new `Isc*` (no @ui and Quasar fallback insufficient)

When neither `index.ts` nor Quasar covers the behavior:

- Follow `SquareUi/src/components/wrapper-page/isc-wrapper-page.vue` for structure
- Export from `SquareUi/src/components/index.ts`
- Ask the user before inventing a one-off in MemberPortal only

## Using context7 for Quasar lookups

Only after confirming no `@ui` match. Example queries:

```
Context7 MCP: Search for "Quasar q-stepper API" or "Quasar q-input props"
```
