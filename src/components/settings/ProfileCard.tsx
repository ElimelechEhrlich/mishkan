import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { Entity, Household, Member } from '../../types/domain';

type ProfileCardProps = {
  readonly member: Member;
  readonly household: Household;
  readonly entities: readonly Entity[];
};

/** Who is signed in, and the household they belong to. */
export function ProfileCard({ member, household, entities }: ProfileCardProps): ReactElement {
  const parentCount = entities.filter((entity) => entity.kind === 'parent').length;
  const childCount = entities.filter((entity) => entity.kind === 'child').length;
  return (
    <section className="flex items-center gap-3.5 rounded-2xl bg-surface p-4 shadow-card">
      <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary font-display text-2xl font-bold text-white">
        {member.name.trim().charAt(0)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-display text-lg font-semibold">{member.name}</span>
        <span className="truncate text-[13px] text-muted">{household.name}</span>
        <span className="text-xs text-faint">
          {String(parentCount)} {labels.settings.parents}
          {labels.item.separator}
          {String(childCount)} {labels.settings.children}
        </span>
      </span>
    </section>
  );
}
