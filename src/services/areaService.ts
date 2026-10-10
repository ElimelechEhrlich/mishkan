import { supabase } from '../lib/supabase';
import type { AreaUpdate, AreaWithDomains, DomainUpdate } from '../types/domain';

/** Areas the current parent can see, each with its visible domains, in display order. */
export async function listAreasWithDomains(): Promise<AreaWithDomains[]> {
  const [areas, domains] = await Promise.all([
    supabase.from('areas').select('*').order('sort_order').order('created_at'),
    supabase.from('domains').select('*').order('sort_order').order('created_at'),
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

type NewArea = {
  readonly householdId: string;
  readonly name: string;
  readonly sortOrder: number;
};

/** New areas start shared; privacy is changed afterwards. */
export async function createArea(newArea: NewArea): Promise<void> {
  const { error } = await supabase.from('areas').insert({
    household_id: newArea.householdId,
    name: newArea.name,
    sort_order: newArea.sortOrder,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function updateArea(areaId: string, changes: AreaUpdate): Promise<void> {
  const { error } = await supabase.from('areas').update(changes).eq('id', areaId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function deleteArea(areaId: string): Promise<void> {
  const { error } = await supabase.from('areas').delete().eq('id', areaId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

type NewDomain = {
  readonly areaId: string;
  readonly name: string;
  readonly sortOrder: number;
};

/** The database copies the household, and the privacy of a private area, from the area. */
export async function createDomain(newDomain: NewDomain): Promise<void> {
  const { error } = await supabase.from('domains').insert({
    area_id: newDomain.areaId,
    name: newDomain.name,
    sort_order: newDomain.sortOrder,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function updateDomain(domainId: string, changes: DomainUpdate): Promise<void> {
  const { error } = await supabase.from('domains').update(changes).eq('id', domainId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function deleteDomain(domainId: string): Promise<void> {
  const { error } = await supabase.from('domains').delete().eq('id', domainId);
  if (error !== null) {
    throw new Error(error.message);
  }
}
