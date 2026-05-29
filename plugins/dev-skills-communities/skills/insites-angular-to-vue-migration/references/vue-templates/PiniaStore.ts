/**
 * Prefer @api in store actions. Call generated clients from actions — do not add a
 * wrapper store action that only re-exports the same @api method unless the user asks.
 * Use @/services/http-service only when no @api client exists (see FALLBACK below).
 *
 * Output file: MemberPortal/src/store/my-feature-store.ts
 */
import { defineStore } from 'pinia';
// import { getSomeData } from '@api/services/query/default/SomeService';
// import type { SomeResponse } from '@api/models/query';

/* TODO: Define your state interface */
interface State {
  data: SomeType | null;
  isInitialized: boolean;
  loading: boolean;
  error: string | null;
}

/* TODO: Prefer types from @api/models/query or @api/models/command */
interface SomeType {
  id: string;
  // ...
}

export const useMyFeatureStore = defineStore('myFeature', {
  state: (): State => ({
    data: null,
    isInitialized: false,
    loading: false,
    error: null,
  }),

  getters: {
    // TODO: Add computed getters
    hasData: (state) => state.data !== null,
  },

  actions: {
    async init() {
      if (this.isInitialized) return;
      this.loading = true;
      try {
        // TODO: Load initial state via @api
        this.isInitialized = true;
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error';
      } finally {
        this.loading = false;
      }
    },

    async loadData(guid: string) {
      this.loading = true;
      try {
        // const result = await getSomeData({ guid });
        // this.data = result;

        // FALLBACK: only when no @api method exists for this endpoint
        // import { get } from '@/services/http-service';
        // this.data = await get<SomeType>(`/api/endpoint/${guid}`);
      } catch (err) {
        this.error = err instanceof Error ? err.message : 'Unknown error';
      } finally {
        this.loading = false;
      }
    },

    reset() {
      this.data = null;
      this.isInitialized = false;
      this.error = null;
    },
  },
});
