import { supabase } from '../lib/supabase';
import type { Attachment, AttachmentWithUrl, Item } from '../types/domain';

const bucket = 'item-attachments';
const urlLifetimeSeconds = 3600;

/** The storage policy reads the item id from the second folder of the path. */
function storagePathFor(item: Item, file: File): string {
  const dot = file.name.lastIndexOf('.');
  const extension = dot === -1 ? '' : file.name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, '');
  return `${item.household_id}/${item.id}/${crypto.randomUUID()}${extension}`;
}

export async function listAttachments(itemId: string): Promise<AttachmentWithUrl[]> {
  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at');
  if (error !== null) {
    throw new Error(error.message);
  }
  if (data.length === 0) {
    return [];
  }
  const signed = await supabase.storage.from(bucket).createSignedUrls(
    data.map((attachment) => attachment.storage_path),
    urlLifetimeSeconds,
  );
  if (signed.error !== null) {
    throw new Error(signed.error.message);
  }
  const urls = new Map(signed.data.map((entry) => [entry.path, entry.signedUrl]));
  return data.map((attachment) => ({
    ...attachment,
    url: urls.get(attachment.storage_path) ?? null,
  }));
}

export async function uploadAttachment(item: Item, file: File): Promise<void> {
  const storagePath = storagePathFor(item, file);
  const uploaded = await supabase.storage.from(bucket).upload(storagePath, file);
  if (uploaded.error !== null) {
    throw new Error(uploaded.error.message);
  }
  const { error } = await supabase
    .from('attachments')
    .insert({ item_id: item.id, storage_path: storagePath, file_name: file.name });
  if (error !== null) {
    await supabase.storage.from(bucket).remove([storagePath]);
    throw new Error(error.message);
  }
}

export async function removeAttachment(attachment: Attachment): Promise<void> {
  const removed = await supabase.storage.from(bucket).remove([attachment.storage_path]);
  if (removed.error !== null) {
    throw new Error(removed.error.message);
  }
  const { error } = await supabase.from('attachments').delete().eq('id', attachment.id);
  if (error !== null) {
    throw new Error(error.message);
  }
}
