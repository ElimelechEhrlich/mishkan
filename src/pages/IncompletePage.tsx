import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { AttentionList } from '../components/items/AttentionList';
import { IncompleteList } from '../components/items/IncompleteList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';

export function IncompletePage(): ReactElement {
  const entities = useEntities();
  const items = useItems();

  return (
    <PageShell
      title={labels.pages.incomplete}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <AttentionList
        entries={items.attention.map((item) => ({
          item,
          reason: labels.reminders.attentionWaiting,
        }))}
      />
      {(items.incomplete.length > 0 || items.attention.length === 0) && (
        <IncompleteList
          items={items.incomplete}
          entities={entities.entities}
          loading={items.loading}
          onUpdate={items.updateItem}
          onStructureChanged={entities.reload}
        />
      )}
      <QuickAddSheet
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        onAddAppointments={items.addAppointments}
      />
    </PageShell>
  );
}
