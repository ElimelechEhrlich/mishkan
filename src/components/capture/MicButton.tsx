import { useRef } from 'react';
import type { ReactElement } from 'react';
import { labels } from '../../constants/labels';
import type { UseVoiceMessage } from '../../hooks/useVoiceMessage';
import { Icon } from '../ui/Icon';

type MicButtonProps = {
  readonly voice: UseVoiceMessage;
  /** A full green button, as the send button it stands in for. */
  readonly solid?: boolean;
};

/**
 * The microphone: hold it to speak and let go to send; a short tap keeps it recording, and it
 * turns into the send button.
 */
export function MicButton({ voice, solid = false }: MicButtonProps): ReactElement {
  // The send button acts only on a press that began on it: on a phone, the click that ends
  // the tap which locked the recording lands on it, where the microphone was.
  const pressedSend = useRef(false);
  if (voice.locked) {
    return (
      <button
        key="send"
        type="button"
        aria-label={labels.assistant.sendVoice}
        onPointerDown={() => {
          pressedSend.current = true;
        }}
        onClick={(event) => {
          // From the keyboard there is no press.
          if (pressedSend.current || event.detail === 0) {
            pressedSend.current = false;
            voice.send();
          }
        }}
        className="flex size-11 shrink-0 animate-fade-in items-center justify-center rounded-full bg-primary text-white shadow-float transition active:scale-90"
      >
        <Icon name="send" className="size-5" />
      </button>
    );
  }
  const holding = voice.active;
  return (
    <button
      key="mic"
      type="button"
      aria-label={labels.assistant.voice}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pressedSend.current = false;
        voice.press();
      }}
      onPointerUp={voice.release}
      onPointerCancel={voice.release}
      onContextMenu={(event) => {
        event.preventDefault();
      }}
      onClick={(event) => {
        // From the keyboard: recording starts, to send or cancel.
        if (event.detail === 0) {
          voice.press();
          voice.release();
        }
      }}
      className={`flex size-11 shrink-0 touch-none items-center justify-center rounded-full transition select-none ${
        holding
          ? 'scale-125 bg-alert text-white shadow-float'
          : solid
            ? 'bg-primary text-white active:scale-90'
            : 'bg-primary-soft text-primary active:scale-90'
      }`}
    >
      <Icon name="mic" className="size-5.5" />
    </button>
  );
}
