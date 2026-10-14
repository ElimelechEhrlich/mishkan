import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { labels } from '../../constants/labels';
import { missingFields } from '../../lib/itemRules';
import type { EntityWithDomains, Item, ItemUpdate } from '../../types/domain';
import { DomainPicker } from '../capture/DomainPicker';
import { TimePicker } from './TimePicker';

type ItemAssignProps = {
  readonly item: Item;
  readonly entities: readonly EntityWithDomains[];
  readonly onUpdate: (itemId: string, changes: ItemUpdate) => void;
  /** Reloads the entities after a child or domain is added while choosing a domain. */
  readonly onStructureChanged: () => Promise<void>;
};

/**
 * One incomplete item. It lists what is still missing and asks for one thing
 * at a time; once that is chosen, the next one takes its place.
 */
export function ItemAssign({
  item,
  entities,
  onUpdate,
  onStructureChanged,
}: ItemAssignProps): ReactElement {
  const missing = missingFields(item);
  // A shopping domain is only for something to buy, as on the item's page.
  const isShopping = item.kind === 'missing_item';
  const domainChoices = entities.map((entity) => ({
    ...entity,
    domains: entity.domains.filter((domain) => (domain.role === 'shopping') === isShopping),
  }));
  const current = missing[0];

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-card">
      <Link to={`/item/${item.id}`} className="flex items-baseline gap-2">
        <span className="min-w-0 flex-1 text-[17px] font-semibold break-words">{item.title}</span>
        {item.kind !== 'task' && (
          <span className="rounded-md bg-primary-soft px-1.5 text-xs font-medium text-primary">
            {item.kind === 'note' && item.is_value ? labels.data.pair : labels.kind[item.kind]}
          </span>
        )}
      </Link>
      {item.previous_domain_label !== null && (
        <p className="text-sm text-muted">
          {labels.item.previouslyIn} {item.previous_domain_label}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {missing.map((field) => (
          <span
            key={field}
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              field === current ? 'bg-alert-soft text-alert' : 'bg-paper text-muted'
            }`}
          >
            {labels.missing[field]}
          </span>
        ))}
      </div>
      {current === 'domain' && (
        <DomainPicker
          entities={domainChoices}
          value={null}
          initialEntityId={item.entity_id}
          onEntityChange={(entityId) => {
            onUpdate(item.id, { entity_id: entityId });
          }}
          onStructureChanged={onStructureChanged}
          onChange={(domainId) => {
            if (domainId !== null) {
              onUpdate(item.id, { domain_id: domainId });
            }
          }}
        />
      )}
      {current === 'time' && (
        <TimePicker
          item={item}
          onPick={(choice) => {
            onUpdate(item.id, choice);
          }}
        />
      )}
    </li>
  );
}
