import { voiceForReading } from '../lib/audio';
import { splitAnswer } from '../lib/format';
import { blobFromBase64, shrinkForReading } from '../lib/image';
import type { AnswerLink } from '../lib/format';
import { supabase } from '../lib/supabase';

/** A photo or voice message sent with a turn, to open or hear again. */
export type TurnMedia = {
  readonly kind: 'image' | 'audio';
  /** Where to load it from; null when it could not be signed. */
  readonly url: string | null;
  /** How long a recording runs. */
  readonly seconds: number | null;
};

export type AssistantTurn = {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly text: string;
  /** Buttons to what the assistant did in this answer. */
  readonly links: readonly AnswerLink[];
  readonly media: TurnMedia | null;
};

/** What is kept of a photo or recording once uploaded, to send with the message. */
export type SentMedia = {
  readonly path: string;
  readonly seconds: number | null;
};

const mediaBucket = 'assistant-media';
const urlLifetimeSeconds = 3600;

function isMediaKind(value: unknown): value is TurnMedia['kind'] {
  return value === 'image' || value === 'audio';
}

/** The signed-in parent's id: their folder in the bucket, which only they can reach. */
async function ownFolder(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error !== null) {
    throw new Error(error.message);
  }
  if (data.session === null) {
    throw new Error('not signed in');
  }
  return data.session.user.id;
}

/** Keeps a photo or recording, to open or hear again in the conversation. */
export async function uploadMedia(file: Blob, seconds: number | null = null): Promise<SentMedia> {
  const extension = file.type.startsWith('image/')
    ? '.jpg'
    : file.type.includes('mp4')
      ? '.m4a'
      : file.type.includes('ogg')
        ? '.ogg'
        : '.webm';
  const path = `${await ownFolder()}/${crypto.randomUUID()}${extension}`;
  const uploaded = await supabase.storage
    .from(mediaBucket)
    .upload(path, file, file.type === '' ? {} : { contentType: file.type });
  if (uploaded.error !== null) {
    throw new Error(uploaded.error.message);
  }
  return { path, seconds };
}

function isRole(value: unknown): value is AssistantTurn['role'] {
  return value === 'user' || value === 'assistant';
}

/** The parent's own conversation with the assistant: its last 200 turns, oldest first. */
export async function listConversation(): Promise<AssistantTurn[]> {
  const { data, error } = await supabase
    .from('assistant_messages')
    .select('id, role, text, media_path, media_kind, media_seconds')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error !== null) {
    throw new Error(error.message);
  }
  const paths = data.flatMap((row) => (row.media_path === null ? [] : [row.media_path]));
  const urls = new Map<string, string>();
  if (paths.length > 0) {
    const signed = await supabase.storage
      .from(mediaBucket)
      .createSignedUrls(paths, urlLifetimeSeconds);
    if (signed.error !== null) {
      throw new Error(signed.error.message);
    }
    for (const entry of signed.data) {
      const url: unknown = entry.signedUrl;
      if (entry.path !== null && typeof url === 'string' && url !== '') {
        urls.set(entry.path, url);
      }
    }
  }
  return data.toReversed().flatMap((row) => {
    if (!isRole(row.role)) {
      return [];
    }
    const media: TurnMedia | null =
      row.media_path !== null && isMediaKind(row.media_kind)
        ? {
            kind: row.media_kind,
            url: urls.get(row.media_path) ?? null,
            seconds: row.media_seconds,
          }
        : null;
    return [
      row.role === 'assistant'
        ? { id: row.id, role: row.role, ...splitAnswer(row.text), media }
        : { id: row.id, role: row.role, text: row.text, links: [], media },
    ];
  });
}

export class AssistantNotEnabled extends Error {}

/** What the function said went wrong, when its answer says (`{ error }`). */
async function refusalOf(response: unknown): Promise<string | null> {
  if (!(response instanceof Response)) {
    return null;
  }
  try {
    const body: unknown = await response.json();
    const said: unknown =
      typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : null;
    return typeof said === 'string' && said !== '' ? said : null;
  } catch {
    return null;
  }
}

/**
 * Sends a message; the assistant answers, and may have added items on the way (`changed`).
 * The server keeps both turns in the conversation.
 */
export async function askAssistant(
  message: string,
  /** A photo to read, as base64 JPEG. */
  image: string | null = null,
  /** A voice message, as base64 WAV. */
  audio: string | null = null,
  /** The photo or recording, kept to open or hear again. */
  media: SentMedia | null = null,
): Promise<{
  readonly reply: string;
  readonly links: readonly AnswerLink[];
  readonly changed: boolean;
  /** What the assistant heard in a voice message, in short. */
  readonly heard: string | null;
}> {
  const answer: { readonly data: unknown; readonly error: unknown } =
    await supabase.functions.invoke('assistant', {
      body: {
        message,
        ...(image === null ? {} : { image }),
        ...(audio === null ? {} : { audio }),
        ...(media === null ? {} : { media_path: media.path, media_seconds: media.seconds }),
      },
    });
  const { data, error } = answer;
  if (error !== null) {
    const errorText = error instanceof Error ? error.message : 'request failed';
    // The function's own refusal comes with its status on the error's response.
    const context: unknown = typeof error === 'object' ? Reflect.get(error, 'context') : undefined;
    const status: unknown =
      typeof context === 'object' && context !== null ? Reflect.get(context, 'status') : null;
    if (status === 403) {
      throw new AssistantNotEnabled(errorText);
    }
    throw new Error((await refusalOf(context)) ?? errorText);
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('no answer');
  }
  const reply: unknown = Reflect.get(data, 'reply');
  const changed: unknown = Reflect.get(data, 'changed');
  const heard: unknown = Reflect.get(data, 'heard');
  if (typeof reply !== 'string') {
    throw new Error('no answer');
  }
  const parsed = splitAnswer(reply);
  return {
    reply: parsed.text,
    links: parsed.links,
    changed: changed === true,
    heard: typeof heard === 'string' && heard !== '' ? heard : null,
  };
}

/** What goes with a message: a photo to read, or a voice message to hear. */
export type Attachment =
  | { readonly kind: 'photo'; readonly file: File }
  | { readonly kind: 'voice'; readonly recording: Blob; readonly seconds: number };

/**
 * Sends a message with what is attached: the photo made small, or the recording as WAV, for
 * the assistant; and kept as it is (the small photo, the recording) to open or hear again.
 */
export async function askWith(
  message: string,
  attachment: Attachment | null,
): ReturnType<typeof askAssistant> {
  if (attachment === null) {
    return askAssistant(message);
  }
  if (attachment.kind === 'photo') {
    const image = await shrinkForReading(attachment.file);
    const media = await uploadMedia(blobFromBase64(image, 'image/jpeg'));
    return askAssistant(message, image, null, media);
  }
  const [audio, media] = await Promise.all([
    voiceForReading(attachment.recording),
    uploadMedia(attachment.recording, Math.round(attachment.seconds * 10) / 10),
  ]);
  return askAssistant(message, null, audio, media);
}

/** Starts the conversation over, with every photo and recording kept in it. */
export async function clearConversation(): Promise<void> {
  const folder = await ownFolder();
  for (;;) {
    const listed = await supabase.storage.from(mediaBucket).list(folder, { limit: 100 });
    if (listed.error !== null) {
      throw new Error(listed.error.message);
    }
    if (listed.data.length === 0) {
      break;
    }
    const removed = await supabase.storage
      .from(mediaBucket)
      .remove(listed.data.map((file) => `${folder}/${file.name}`));
    if (removed.error !== null) {
      throw new Error(removed.error.message);
    }
  }
  const { error } = await supabase.from('assistant_messages').delete().not('id', 'is', null);
  if (error !== null) {
    throw new Error(error.message);
  }
}
