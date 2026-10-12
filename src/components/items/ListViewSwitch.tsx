import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { useHouseholdContext } from '../../hooks/useRouteContext';
import type { ListView } from '../../types/domain';
import { Segmented } from '../ui/Segmented';

type ListViewSwitchProps = {
  readonly value: ListView;
  readonly onChange: (view: ListView) => void;
  /** The name of the default arrangement where it is not by time, such as newest first. */
  readonly timeLabel?: string;
};

/**
 * How a tab of one kind arranges its list: by time (the default), or by domain, which is
 * called a list while one domain is chosen.
 */
export function ListViewSwitch({
  value,
  onChange,
  timeLabel = labels.listView.time,
}: ListViewSwitchProps): ReactElement {
  const { topic } = useHouseholdContext();
  const options = [
    { value: 'time', label: timeLabel },
    { value: 'domain', label: topic === null ? labels.listView.domain : labels.listView.oneDomain },
  ] as const;
  return <Segmented options={options} value={value} onChange={onChange} />;
}
