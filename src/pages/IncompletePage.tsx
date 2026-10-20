import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { AttentionList } from '../components/items/AttentionList';
import { IncompleteList } from '../components/items/IncompleteList';
import { TripDoneList } from '../components/shopping/TripDoneList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useRepeats } from '../hooks/useRepeats';

export function IncompletePage(): ReactElement {
  const entities = useEntities();
  const items = useItems();
  const repeats = useRepeats();

  return (
    <PageShell
      title={labels.pages.incomplete}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
    >
      <ErrorBanner message={items.error ?? entities.error ?? repeats.error} />
      <TripDoneList
        trips={items.attention
          .filter((entry) => entry.reason === 'tripDone')
          .map((entry) => entry.item)}
        onClose={(trip) => {
          items.updateItem(trip.id, { trip_run_done_at: null });
          items.completeItem(trip);
        }}
        onKeep={(trip) => {
          items.updateItem(trip.id, { trip_run_done_at: null });
        }}
      />
      <AttentionList
        entries={items.attention
          .filter((entry) => entry.reason !== 'tripDone')
          .map(({ item, reason }) => ({
            item,
            reason:
              reason === 'lateStep'
                ? labels.goals.attentionLate
                : labels.reminders.attentionWaiting,
          }))}
      />
      {(items.incomplete.length > 0 || items.attention.length === 0) && (
        <IncompleteList
          items={items.incomplete}
          entities={entities.entities}
          loading={items.loading}
          onUpdate={items.updateItem}
          onStructureChanged={entities.reload}
          repeats={repeats.byItem}
          onSetRepeat={repeats.set}
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
