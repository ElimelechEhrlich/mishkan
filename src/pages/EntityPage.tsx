import type { ReactElement } from 'react';
import { DomainSectionList } from '../components/entities/DomainSectionList';
import { EntityStrip } from '../components/entities/EntityStrip';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { labels } from '../constants/labels';
import { useEntityPage } from '../hooks/useEntityPage';

export function EntityPage(): ReactElement {
  const page = useEntityPage();
  const { entities, items, entity } = page;

  return (
    <PageShell
      title={entity?.name ?? labels.pages.entity}
      subtitle={entity === undefined ? undefined : labels.entityKind[entity.kind]}
      incompleteCount={items.incomplete.length}
      inner
    >
      <ErrorBanner message={items.error ?? entities.error} />
      <EntityStrip entities={entities.entities} counts={page.counts} currentId={entity?.id} />
      {entity === undefined ? (
        <EmptyState
          text={entities.loading ? labels.status.loading : labels.status.entityNotFound}
        />
      ) : (
        <DomainSectionList
          sections={page.sections}
          lookups={page.lookups}
          loading={items.loading}
          onComplete={items.completeItem}
        />
      )}
    </PageShell>
  );
}
