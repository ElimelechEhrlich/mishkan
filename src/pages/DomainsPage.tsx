import type { ReactElement } from 'react';
import { TopicSection } from '../components/entities/TopicSection';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { PageShell } from '../components/ui/PageShell';
import { SkeletonList } from '../components/ui/SkeletonList';
import { labels } from '../constants/labels';
import { useEntities } from '../hooks/useEntities';
import { useItems } from '../hooks/useItems';
import { useLookups } from '../hooks/useLookups';
import { useHouseholdContext } from '../hooks/useRouteContext';
import { useTopicSections } from '../hooks/useTopicSections';

export function DomainsPage(): ReactElement {
  const { members } = useHouseholdContext();
  const entities = useEntities();
  const items = useItems();
  const lookups = useLookups(entities.entities, members);
  const sections = useTopicSections(entities.entities, items.items, items.steps);

  return (
    <PageShell
      title={labels.pages.byDomain}
      subtitle={labels.scope.everythingHint}
      incompleteCount={items.incomplete.length}
      inner
    >
      <ErrorBanner message={items.error ?? entities.error} />
      {sections.length === 0 ? (
        items.loading ? (
          <SkeletonList />
        ) : (
          <EmptyState text={labels.status.emptySegment} />
        )
      ) : (
        <div className="flex flex-col gap-2.5">
          {sections.map((section) => (
            <TopicSection
              key={section.topic}
              topic={section.topic}
              entries={section.rows}
              lookups={lookups}
              onComplete={items.completeItem}
              defaultOpen={sections.length === 1}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
