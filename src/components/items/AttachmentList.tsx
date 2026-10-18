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

/**
 * Files attached to one item, and a small button to attach one. Files exist only as part of an
 * item.
 */
export function AttachmentList({ item }: AttachmentListProps): ReactElement {
  const { attachments, busy, error, upload, remove } = useAttachments(item);
  const inputId = useId();

  return (
    <div className="flex flex-col gap-2">
      <ErrorBanner message={error} />
      {attachments.length > 0 && (
        <p className="px-1 text-[13px] font-semibold text-muted">{labels.sections.attachments}</p>
      )}
      <ul
        className={
          attachments.length > 0
            ? 'flex flex-col gap-1 rounded-2xl bg-surface px-4 py-2 shadow-card'
            : 'hidden'
        }
      >
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
        className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-full bg-primary-soft px-3.5 text-[13px] font-medium text-primary transition active:scale-[0.97] ${busy ? 'opacity-40' : ''}`}
      >
        <Icon name="clip" className="size-4" />
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
