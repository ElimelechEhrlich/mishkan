import { supabase } from '../lib/supabase';
import type {
  AddableEntityKind,
  DomainRole,
  DomainUpdate,
  EntityWithDomains,
} from '../types/domain';

/** Entities the current parent can see, each with its domains, in display order. */
export async function listEntitiesWithDomains(): Promise<EntityWithDomains[]> {
  const [entities, domains] = await Promise.all([
    supabase.from('entities').select('*').order('sort_order').order('created_at'),
    supabase.from('domains').select('*').order('sort_order').order('created_at'),
  ]);
  if (entities.error !== null) {
    throw new Error(entities.error.message);
  }
  if (domains.error !== null) {
    throw new Error(domains.error.message);
  }
  const allDomains = domains.data;
  return entities.data.map((entity) => ({
    ...entity,
    domains: allDomains.filter((domain) => domain.entity_id === entity.id),
  }));
}

type NewEntity = {
  readonly householdId: string;
  readonly kind: AddableEntityKind;
  readonly name: string;
  readonly sortOrder: number;
};

/** The database opens the basic domains of the kind on its own. */
export async function createEntity(newEntity: NewEntity): Promise<void> {
  const { error } = await supabase.from('entities').insert({
    household_id: newEntity.householdId,
    kind: newEntity.kind,
    name: newEntity.name,
    sort_order: newEntity.sortOrder,
  });
  if (error !== null) {
    throw new Error(error.message);
  }
}

export async function renameEntity(entityId: string, name: string): Promise<void> {
  const { error } = await supabase.from('entities').update({ name }).eq('id', entityId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Its items are not deleted: they move to "needs completion" of the current parent. */
export async function deleteEntity(entityId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_entity', { p_entity_id: entityId });
  if (error !== null) {
    throw new Error(error.message);
  }
}

type NewDomain = {
  readonly entityId: string;
  readonly name: string;
  readonly role: DomainRole;
  readonly sortOrder: number;
};

/** The database copies the household from the entity. */
export async function createDomain(newDomain: NewDomain): Promise<void> {
  const { error } = await supabase.from('domains').insert({
    entity_id: newDomain.entityId,
    name: newDomain.name,
    role: newDomain.role,
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

/** Its items are not deleted: they move to "needs completion" of the current parent. */
export async function deleteDomain(domainId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_domain', { p_domain_id: domainId });
  if (error !== null) {
    throw new Error(error.message);
  }
}
