import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import { usePushPrompt } from '../../hooks/useSetupSteps';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/**
 * At the head of the main page, while this phone gets no notifications: turning them on is one
 * tap here and one "allow" in the phone's question. "Not now" puts it away on this phone.
 */
export function PushPrompt(): ReactElement | null {
  const prompt = usePushPrompt();
  if (!prompt.show) {
    return null;
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-primary-soft p-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
        <Icon name="bell" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-semibold text-ink">{labels.setup.pushPrompt}</span>
        <span className="text-[13px] text-muted">{labels.setup.pushPromptHint}</span>
        <span className="flex gap-1.5 pt-2">
          <Button disabled={prompt.busy} onClick={prompt.enable}>
            {labels.setup.actions.notifications}
          </Button>
          <Button variant="ghost" onClick={prompt.notNow}>
            {labels.setup.notNow}
          </Button>
        </span>
      </span>
    </div>
  );
}
