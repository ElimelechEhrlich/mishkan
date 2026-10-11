import type { ReactElement } from 'react';
import { QuickAddSheet } from '../components/capture/QuickAddSheet';
import { DomainSectionList } from '../components/entities/DomainSectionList';
import { EntityProfileCard } from '../components/entities/EntityProfileCard';
import { EntityHeading } from '../components/entities/EntityHeading';
import { EntitySwitcher } from '../components/entities/EntitySwitcher';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntityPage } from '../hooks/useEntityPage';
import { useHouseholdContext } from '../hooks/useRouteContext';

export function EntityPage(): ReactElement {
  const { setScope } = useHouseholdContext();
  const page = useEntityPage();
  const { entities, items, entity, addRequest } = page;

  return (
    <PageShell
      title={entity?.name ?? labels.pages.entity}
      incompleteCount={items.incomplete.length}
      inner
      heading={
        entity === undefined ? undefined : (
          <EntityHeading entity={entity} tone={page.tone} openCount={page.openCount} />
        )
      }
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <EntitySwitcher
        entities={entities.entities}
        currentId={entity?.id}
        onMain={() => {
          setScope(null);
        }}
      />
      {entity === undefined ? (
        <EmptyState
          text={entities.loading ? labels.status.loading : labels.status.entityNotFound}
        />
      ) : (
        <div
          key={`items-${entity.id}`}
          className={
            page.direction === 'next' ? 'animate-entity-next' : 'animate-entity-previous'
          }
        >
          {page.hasProfile && (
            <div className="mb-4">
              <EntityProfileCard entity={entity} onEntityChanged={entities.reload} />
            </div>
          )}
          <DomainSectionList
            sections={page.sections}
            lookups={page.lookups}
            loading={items.loading}
            onComplete={items.completeItem}
            onAdd={page.requestAdd}
          />
        </div>
      )}
      <QuickAddSheet
        key={`add-${entity?.id ?? ''}-${String(addRequest?.key ?? 0)}`}
        entities={entities.entities}
        onAdd={items.addItem}
        onAddMissingItem={items.addMissingItem}
        onAddDebt={items.addDebt}
        entityId={entity?.id}
        initialDomainId={addRequest?.domainId}
        initiallyOpen={addRequest !== null}
      />
    </PageShell>
  );
}
