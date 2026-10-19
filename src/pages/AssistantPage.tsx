import type { ReactElement } from 'react';
import { AssistantChat } from '../components/capture/AssistantChat';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { EmptyState } from '../components/ui/EmptyState';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useAssistant } from '../hooks/useAssistant';
import { useItems } from '../hooks/useItems';

export function AssistantPage(): ReactElement {
  const items = useItems();
  const assistant = useAssistant();

  return (
    <PageShell
      title={labels.assistant.title}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      inner
      hideNav
    >
      <ErrorBanner message={assistant.error} />
      {assistant.loaded ? (
        <AssistantChat
          turns={assistant.turns}
          sending={assistant.sending}
          onSend={assistant.send}
          onRetry={assistant.retry}
          onClear={assistant.clear}
        />
      ) : (
        <EmptyState text={labels.status.loading} />
      )}
    </PageShell>
  );
}
