import { supabase } from '../lib/supabase';
import type { AreaWithDomains } from '../types/domain';

/** Areas the current parent can see, each with its visible domains, in display order. */
export async function listAreasWithDomains(): Promise<AreaWithDomains[]> {
  const [areas, domains] = await Promise.all([
    supabase.from('areas').select('*').order('sort_order'),
    supabase.from('domains').select('*').order('sort_order'),
  ]);
  if (areas.error !== null) {
    throw new Error(areas.error.message);
  }
  if (domains.error !== null) {
    throw new Error(domains.error.message);
  }
  const allDomains = domains.data;
  return areas.data.map((area) => ({
    ...area,
    domains: allDomains.filter((domain) => domain.area_id === area.id),
  }));
}
