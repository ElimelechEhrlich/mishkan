import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { ListView } from '../../types/domain';
import { Segmented } from '../ui/Segmented';

type ListViewSwitchProps = {
  readonly value: ListView;
  readonly onChange: (view: ListView) => void;
};

const options = [
  { value: 'time', label: labels.listView.time },
  { value: 'domain', label: labels.listView.domain },
] as const;

/** How a tab of one kind arranges its list: by time (the default), or by domain. */
export function ListViewSwitch({ value, onChange }: ListViewSwitchProps): ReactElement {
  return <Segmented options={options} value={value} onChange={onChange} />;
}
