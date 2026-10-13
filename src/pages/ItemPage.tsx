import type { ReactElement } from 'react';
import { ItemEditor } from '../components/items/ItemEditor';
import { SnoozeSheet } from '../components/items/SnoozeSheet';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItemPage } from '../hooks/useItemPage';
import { useLookups } from '../hooks/useLookups';
import { useReminderPeople } from '../hooks/useReminderPeople';
import { useSnoozeRequest } from '../hooks/useSnoozeRequest';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function ItemPage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const page = useItemPage();
  const lookups = useLookups(entities.entities, members);
  const reminderPeople = useReminderPeople(members);
  const { items, item } = page;
  const snooze = useSnoozeRequest();

  return (
    <PageShell
      title={item === null ? labels.pages.item : labels.kind[item.kind]}
      incompleteCount={items.incomplete.length}
      todayCount={items.todayCount}
      inner
    >
      <ErrorBanner
        message={
          items.error ?? page.error ?? entities.error ?? reminderPeople.error ?? snooze.error
        }
      />
      {item === null ? (
        <EmptyState text={items.loading ? labels.status.loading : labels.status.itemNotFound} />
      ) : (
        <ItemEditor
          item={item}
          items={items.items}
          steps={page.steps}
          questions={page.questions}
          debt={page.debt}
          hasDebtDetails={page.hasDebtDetails}
          entities={entities.entities}
          lookups={lookups}
          onUpdate={items.updateItem}
          reminderPeople={reminderPeople.people}
          onStructureChanged={entities.reload}
          onComplete={items.completeItem}
          onReopen={items.reopenItem}
          onDelete={page.deleteAndLeave}
          onAddStep={page.addStep}
          onAddQuestion={items.addQuestion}
          onConvert={(itemId, conversion) => {
            void items.convertItem(itemId, conversion);
          }}
          onPrerequisitesChange={items.reload}
        />
      )}
      {snooze.open && item !== null && (
        <SnoozeSheet
          title={item.title}
          onChoose={(choice) => {
            snooze.choose(item.id, choice);
          }}
          onClose={snooze.close}
        />
      )}
    </PageShell>
  );
}
