import { splitAnswer } from '../lib/format';
import type { AnswerLink } from '../lib/format';
import { supabase } from '../lib/supabase';

export type AssistantTurn = {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly text: string;
  /** Buttons to what the assistant did in this answer. */
  readonly links: readonly AnswerLink[];
};

function isRole(value: unknown): value is AssistantTurn['role'] {
  return value === 'user' || value === 'assistant';
}

/** The parent's own conversation with the assistant, oldest first. */
export async function listConversation(): Promise<AssistantTurn[]> {
  const { data, error } = await supabase
    .from('assistant_messages')
    .select('id, role, text')
    .order('created_at')
    .limit(200);
  if (error !== null) {
    throw new Error(error.message);
  }
  return data.flatMap((row) =>
    isRole(row.role)
      ? [
          row.role === 'assistant'
            ? { id: row.id, role: row.role, ...splitAnswer(row.text) }
            : { id: row.id, role: row.role, text: row.text, links: [] },
        ]
      : [],
  );
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
): Promise<{
  readonly reply: string;
  readonly links: readonly AnswerLink[];
  readonly changed: boolean;
}> {
  const answer: { readonly data: unknown; readonly error: unknown } =
    await supabase.functions.invoke('assistant', {
      body: image === null ? { message } : { message, image },
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
  if (typeof reply !== 'string') {
    throw new Error('no answer');
  }
  const parsed = splitAnswer(reply);
  return { reply: parsed.text, links: parsed.links, changed: changed === true };
}

/** Starts the conversation over. */
export async function clearConversation(): Promise<void> {
  const { error } = await supabase.from('assistant_messages').delete().not('id', 'is', null);
  if (error !== null) {
    throw new Error(error.message);
  }
}
