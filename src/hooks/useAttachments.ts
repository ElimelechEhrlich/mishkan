import { useCallback, useEffect, useState } from 'react';
import { toMessage } from '../lib/errors';
import { listAttachments, removeAttachment, uploadAttachment } from '../services/attachmentService';
import type { Attachment, AttachmentWithUrl, Item } from '../types/domain';

type AttachmentsState = {
  readonly attachments: readonly AttachmentWithUrl[];
  readonly busy: boolean;
  readonly error: string | null;
};

export type UseAttachments = AttachmentsState & {
  readonly upload: (file: File) => void;
  readonly remove: (attachment: Attachment) => void;
};

export function useAttachments(item: Item): UseAttachments {
  const [state, setState] = useState<AttachmentsState>({
    attachments: [],
    busy: false,
    error: null,
  });
  const itemId = item.id;

  const load = useCallback(async (): Promise<void> => {
    try {
      const attachments = await listAttachments(itemId);
      setState({ attachments, busy: false, error: null });
    } catch (error: unknown) {
      setState((previous) => ({ ...previous, busy: false, error: toMessage(error) }));
    }
  }, [itemId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = useCallback(
    (change: () => Promise<void>): void => {
      setState((previous) => ({ ...previous, busy: true }));
      change()
        .then(load)
        .catch((error: unknown) => {
          setState((previous) => ({ ...previous, busy: false, error: toMessage(error) }));
        });
    },
    [load],
  );

  return {
    ...state,
    upload: (file): void => {
      run(() => uploadAttachment(item, file));
    },
    remove: (attachment): void => {
      run(() => removeAttachment(attachment));
    },
  };
}
