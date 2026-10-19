import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** What another screen hands to the conversation: a message to send, or a photo to attach. */
export type ChatHandoff = {
  readonly message: string | null;
  readonly photo: File | null;
};

function isHandoff(value: unknown): value is ChatHandoff {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    'photo' in value &&
    (typeof value.message === 'string' || value.message === null) &&
    (value.photo instanceof File || value.photo === null)
  );
}

/**
 * Takes what was handed to the conversation once it is ready: a message is sent at once, and a
 * photo is given back to be attached. It is taken only once, and left out of the page's
 * history, so going back or reloading does not send it again.
 */
export function useChatHandoff(
  ready: boolean,
  send: (message: string, photo?: File | null) => void,
): File | null {
  const location = useLocation();
  const navigate = useNavigate();
  const taken = useRef(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const handoff: unknown = location.state;

  useEffect(() => {
    if (!ready || taken.current || !isHandoff(handoff)) {
      return;
    }
    taken.current = true;
    if (handoff.message !== null) {
      send(handoff.message);
    } else {
      setPhoto(handoff.photo);
    }
    void navigate(location.pathname, { replace: true, state: null });
  }, [ready, handoff, send, navigate, location.pathname]);

  return photo;
}
