import { useId } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useAttachments } from '../../hooks/useAttachments';
import type { Item } from '../../types/domain';
import { ErrorBanner } from '../ui/ErrorBanner';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';

type AttachmentListProps = {
  readonly item: Item;
};

/** Files attached to one item. Files exist only as part of an item. */
export function AttachmentList({ item }: AttachmentListProps): ReactElement {
  const { attachments, busy, error, upload, remove } = useAttachments(item);
  const inputId = useId();

  return (
    <div className="flex flex-col gap-3">
      <ErrorBanner message={error} />
      <ul className="flex flex-col gap-1">
        {attachments.map((attachment) => (
          <li key={attachment.id} className="flex items-center gap-2">
            <Icon name="clip" className="size-4 text-muted" />
            {attachment.url === null ? (
              <span className="min-w-0 flex-1 truncate">{attachment.file_name}</span>
            ) : (
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                dir="auto"
                className="min-w-0 flex-1 truncate text-primary underline underline-offset-4"
              >
                {attachment.file_name}
              </a>
            )}
            <IconButton
              icon="close"
              label={labels.actions.delete}
              onClick={() => {
                remove(attachment);
              }}
            />
          </li>
        ))}
      </ul>
      <label
        htmlFor={inputId}
        className={`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-soft px-4 font-medium text-primary ${busy ? 'opacity-40' : ''}`}
      >
        <Icon name="clip" />
        {busy ? labels.status.loading : labels.actions.attachFile}
      </label>
      <input
        id={inputId}
        type="file"
        disabled={busy}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file !== null && file !== undefined) {
            upload(file);
          }
          event.target.value = '';
        }}
      />
    </div>
  );
}
