/**
 * FALLBACK ONLY — prefer calling @api from the consuming .vue or Pinia store and omit
 * this wrapper module when the generated client already exposes the endpoint.
 * See references/service-patterns.md ("API Auto-Generated Client").
 *
 * // Preferred — in page or store, not a new *-service.ts:
 * // import { getManualRaffles } from '@api/services/query/default/IncentiveService';
 * // import type { ManualRaffleListItemResponse } from '@api/models/query';
 * // const result = await getManualRaffles();
 */
import { get, post, put } from '@/services/http-service';

/* TODO: Prefer types from @api/models/query or @api/models/command when available */
export interface SomeResult {
  id: string;
  name: string;
}

/* TODO: Convert Angular service methods to exported functions — only if no @api client */

/**
 * Fetches data by GUID.
 * FALLBACK: use only when api/dist has no generated method for this URL.
 */
export async function getData(guid: string): Promise<SomeResult> {
  return get<SomeResult>(`/api/endpoint/${guid}`);
}

/**
 * Creates a new resource.
 * FALLBACK: use only when api/dist has no generated method for this URL.
 */
export async function createData(payload: Record<string, unknown>): Promise<SomeResult> {
  return post<SomeResult>('/api/endpoint', payload);
}
