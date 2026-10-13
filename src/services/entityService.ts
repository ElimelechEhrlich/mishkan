import { inDisplayOrder } from '../lib/childOrder';
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
  const urls = await avatarUrls(
    entities.data.flatMap((entity) => (entity.avatar_path === null ? [] : [entity.avatar_path])),
  );
  const ordered = entities.data.map((entity) => ({
    ...entity,
    domains: allDomains.filter((domain) => domain.entity_id === entity.id),
    avatarUrl: entity.avatar_path === null ? null : (urls.get(entity.avatar_path) ?? null),
  }));
  return inDisplayOrder(ordered);
}

const avatarBucket = 'entity-avatars';
/** Long enough that a copy kept on the device still shows the photos. */
const avatarUrlSeconds = 60 * 60 * 24 * 30;

async function avatarUrls(paths: readonly string[]): Promise<Map<string, string>> {
  if (paths.length === 0) {
    return new Map();
  }
  const { data, error } = await supabase.storage
    .from(avatarBucket)
    .createSignedUrls([...paths], avatarUrlSeconds);
  if (error !== null) {
    throw new Error(error.message);
  }
  const urls = new Map<string, string>();
  for (const entry of data) {
    const { path, signedUrl } = entry;
    if (path !== null && signedUrl !== null && signedUrl !== '') {
      urls.set(path, signedUrl);
    }
  }
  return urls;
}

/** Saves a photo for an entity (already made small) and makes it the entity's picture. */
export async function setEntityPhoto(entity: EntityWithDomains, photo: Blob): Promise<void> {
  const path = `${entity.household_id}/${entity.id}/${crypto.randomUUID()}.jpg`;
  const uploaded = await supabase.storage
    .from(avatarBucket)
    .upload(path, photo, { contentType: 'image/jpeg' });
  if (uploaded.error !== null) {
    throw new Error(uploaded.error.message);
  }
  const { error } = await supabase
    .from('entities')
    .update({ avatar_path: path, avatar_emoji: null })
    .eq('id', entity.id);
  if (error !== null) {
    await supabase.storage.from(avatarBucket).remove([path]);
    throw new Error(error.message);
  }
  await removeOldPhoto(entity.avatar_path);
}

/** Shows an emoji instead of the letter, or the letter again when `emoji` is null. */
export async function setEntityEmoji(
  entity: EntityWithDomains,
  emoji: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('entities')
    .update({ avatar_emoji: emoji, avatar_path: null })
    .eq('id', entity.id);
  if (error !== null) {
    throw new Error(error.message);
  }
  await removeOldPhoto(entity.avatar_path);
}

async function removeOldPhoto(path: string | null): Promise<void> {
  if (path === null) {
    return;
  }
  const { error } = await supabase.storage.from(avatarBucket).remove([path]);
  if (error !== null) {
    throw new Error(error.message);
  }
}

type NewEntity = {
  readonly householdId: string;
  readonly kind: AddableEntityKind;
  readonly name: string;
  readonly sortOrder: number;
};

/** The database opens the basic domains of the kind on its own. Returns the new id. */
export async function createEntity(newEntity: NewEntity): Promise<string> {
  const { data, error } = await supabase
    .from('entities')
    .insert({
      household_id: newEntity.householdId,
      kind: newEntity.kind,
      name: newEntity.name,
      sort_order: newEntity.sortOrder,
    })
    .select('id')
    .single();
  if (error !== null) {
    throw new Error(error.message);
  }
  return data.id;
}

export async function renameEntity(entityId: string, name: string): Promise<void> {
  const { error } = await supabase.from('entities').update({ name }).eq('id', entityId);
  if (error !== null) {
    throw new Error(error.message);
  }
}

/** Its items are not deleted: they move to "needs completion" of the current parent. */
/** Saves the order of the children that a parent set by hand. */
export async function setChildPositions(
  places: readonly { readonly id: string; readonly position: number }[],
): Promise<void> {
  const results = await Promise.all(
    places.map((place) =>
      supabase.from('entities').update({ position: place.position }).eq('id', place.id),
    ),
  );
  for (const { error } of results) {
    if (error !== null) {
      throw new Error(error.message);
    }
  }
}

/** Goes back to showing the children by age. */
export async function clearChildPositions(childIds: readonly string[]): Promise<void> {
  const { error } = await supabase
    .from('entities')
    .update({ position: null })
    .in('id', [...childIds]);
  if (error !== null) {
    throw new Error(error.message);
  }
}

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

/** The database copies the household from the entity. Returns the new id. */
export async function createDomain(newDomain: NewDomain): Promise<string> {
  const { data, error } = await supabase
    .from('domains')
    .insert({
      entity_id: newDomain.entityId,
      name: newDomain.name,
      role: newDomain.role,
      sort_order: newDomain.sortOrder,
    })
    .select('id')
    .single();
  if (error !== null) {
    throw new Error(error.message);
  }
  return data.id;
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
