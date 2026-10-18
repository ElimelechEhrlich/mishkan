import type { ReactElement } from 'react';
import { ItemEditor } from '../components/items/ItemEditor';
import { SnoozeSheet } from '../components/items/SnoozeSheet';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItemData } from '../hooks/useItemData';
import { useTrackerEntries } from '../hooks/useTrackerEntries';
import { useItemOccurrences } from '../hooks/useItemOccurrences';
import { useItemPage } from '../hooks/useItemPage';
import { useRepeats } from '../hooks/useRepeats';
import { useShoppingDepartments } from '../hooks/useShoppingDepartments';
import { departmentFor, titleKey } from '../lib/departments';
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
  const itemData = useItemData();
  const trackerEntries = useTrackerEntries();
  const { reminders } = items;
  const repeats = useRepeats();
  const history = useItemOccurrences(item?.id ?? null);
  const departments = useShoppingDepartments();

  return (
    <PageShell
      title={item === null ? labels.pages.item : labels.kind[item.kind]}
      incompleteCount={items.incompleteCount}
      todayCount={items.todayCount}
      inner
      heading={
        <p className="text-[13px] font-medium text-muted">
          {item === null ? labels.pages.item : labels.kind[item.kind]}
        </p>
      }
    >
      <ErrorBanner
        message={
          items.error ??
          page.error ??
          entities.error ??
          reminderPeople.error ??
          snooze.error ??
          itemData.error ??
          reminders.error ??
          repeats.error ??
          history.error ??
          trackerEntries.error ??
          departments.error
        }
      />
      {item === null ? (
        <EmptyState text={items.loading ? labels.status.loading : labels.status.itemNotFound} />
      ) : (
        <ItemEditor
          key={item.id}
          item={item}
          items={items.items}
          steps={page.steps}
          questions={page.questions}
          data={itemData.byItem.get(item.id) ?? []}
          onAddData={itemData.add}
          onUpdateData={itemData.update}
          onRemoveData={itemData.remove}
          onMoveData={itemData.move}
          trackers={page.trackers}
          trackerEntries={trackerEntries.byItem}
          onAddTracker={page.addTracker}
          onAddEntry={trackerEntries.add}
          onUpdateEntry={trackerEntries.update}
          onRemoveEntry={trackerEntries.remove}
          debt={page.debt}
          hasDebtDetails={page.hasDebtDetails}
          entities={entities.entities}
          lookups={lookups}
          onUpdate={items.updateItem}
          onUpdateDebt={items.updateDebt}
          reminderPeople={reminderPeople.people}
          reminders={reminders.byItem.get(item.id) ?? []}
          onAddReminder={reminders.add}
          onUpdateReminder={reminders.update}
          onRemoveReminder={reminders.remove}
          repeat={repeats.byItem.get(item.id) ?? null}
          occurrences={history.occurrences}
          onSetRepeat={repeats.set}
          onStopRepeat={repeats.stop}
          onResumeRepeat={repeats.resume}
          onSkip={repeats.skip}
          onUnmarkOccurrence={repeats.unmark}
          onCloseItem={repeats.close}
          onMoveOccurrence={repeats.move}
          onStructureChanged={entities.reload}
          onComplete={items.completeItem}
          onReopen={items.reopenItem}
          onDelete={page.deleteAndLeave}
          onDuplicate={page.duplicateAndOpen}
          onAddStep={page.addStep}
          onAddQuestion={items.addQuestion}
          onConvert={(itemId, conversion) => {
            void items.convertItem(itemId, conversion);
          }}
          onPrerequisitesChange={items.reload}
          department={
            departments.loaded
              ? {
                  departments: departments.departments,
                  current: departmentFor(item.title, departments.departments, departments.chosen),
                  chosen: departments.chosen.has(titleKey(item.title)),
                  onChoose: (departmentId): void => {
                    departments.choose(item.title, departmentId);
                  },
                  onAdd: (name): Promise<void> => departments.addAndChoose(name, item.title),
                }
              : undefined
          }
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
