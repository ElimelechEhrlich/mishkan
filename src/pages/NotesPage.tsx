import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { ScopeBar } from '../components/entities/ScopeBar';
import { ItemList } from '../components/items/ItemList';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useNotes } from '../hooks/useNotes';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useScopedItems } from '../hooks/useScopedItems';

export function NotesPage(): ReactElement {
  const { members, scopeId, setScope } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const scoped = useScopedItems(items, entities.entities);
  const lookups = useLookups(entities.entities, members);
  const notes = useNotes(scoped.notes);

  return (
    <PageShell title={labels.pages.notes} incompleteCount={scoped.incomplete.length}>
      <ErrorBanner message={items.error ?? entities.error} />
      <ScopeBar entities={entities.entities} scopeId={scopeId} onChange={setScope} />
      <ItemList
        entries={notes}
        lookups={lookups}
        grouped={false}
        loading={items.loading}
        onComplete={items.completeItem}
        emptyText={labels.status.noNotes}
      />
      <QuickAddSheet
        entities={entities.entities}
        onStructureChanged={entities.reload}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        defaultKind="note"
        entityId={scoped.scope?.id}
      />
    </PageShell>
  );
}
