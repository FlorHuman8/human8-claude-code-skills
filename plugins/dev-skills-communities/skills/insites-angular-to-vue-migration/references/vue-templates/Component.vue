<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useVuelidate } from '@vuelidate/core';
import { required } from '@vuelidate/validators';
import { helpers } from '@vuelidate/validators';
import { useConstantsStore } from '@/store/constants-store';
// import { IscWrapperPage } from '@ui/components';
// import { someQueryMethod } from '@api/services/query/default/SomeService';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const getLabelValue = useConstantsStore().getLabelValue;

// TODO: Add props based on Angular bindings
const props = defineProps<{
}>();

// TODO: Add emits based on Angular & bindings
const emit = defineEmits<{
}>();

const loading = ref(true);
const error = ref<string | null>(null);

// TODO: Add form fields if migrating a form (replace with actual field names)
// const fieldName = ref('');

// TODO: Add Vuelidate rules if migrating a form with ng-messages / FormController
// const v$ = useVuelidate(
//   {
//     fieldName: {
//       required: helpers.withMessage(getLabelValue('LabelFieldRequired', 'Field is required'), required),
//     },
//   },
//   { fieldName },
// );

const pageGuid = computed(() => route.params.pageGuid as string);

onMounted(async () => {
  try {
    loading.value = true;
    // TODO: Move $onInit logic here; prefer @api clients over http-service
    // const data = await someQueryMethod();
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'An error occurred';
    $q.notify({ type: 'negative', message: error.value });
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  // TODO: Move $onDestroy cleanup here
});

function goBack() {
  // TODO: Convert $state.go or $location.url logic
  router.push({ name: 'TODO' });
}
</script>

<template>
  <div class="my-feature-page">
    <!-- TODO: Convert Angular template here -->
    <!-- Prefer @ui Isc* components before raw q-* (see SquareUi/src/components/index.ts) -->
    <!-- Replace ng-if → v-if, ng-click → @click, ng-repeat → v-for -->
    <!-- Replace {{ 'LabelKey' | translate }} → {{ getLabelValue('LabelKey', 'Fallback') }} -->
    <!-- Replace ng-transclude → <slot />, ng-transclude-slot="x" → <template #x> -->

    <!-- TODO: Example form field with label + Vuelidate (remove if no form) -->
    <!-- <q-input
      v-model="fieldName"
      :label="getLabelValue('LabelFieldName', 'Field name')"
      :error="v$.fieldName.$error"
      :error-message="v$.fieldName.$errors[0]?.$message"
      @blur="v$.fieldName.$touch"
    /> -->

    <q-btn
      label="Back"
      flat
      @click="goBack"
    />
  </div>
</template>

<!-- Never use scoped on migrated components -->
<style lang="scss">
.my-feature-page {
  // TODO: Move Angular SCSS here, remove vm. prefix from any CSS
}
</style>
