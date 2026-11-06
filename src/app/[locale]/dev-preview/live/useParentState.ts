'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/content/types';
import {
  PREVIEW_PROTOCOL,
  forwardEscapeToParent,
  parseStateMessage,
  type ReadyMessage,
  type StateMessage,
} from '@/lib/preview-bridge';

const RETRY_MS = 400;
const MAX_REPEATS = 3;

/**
 * The latest validated state sent by the embedding Admin window. Messages are accepted only from the parent window
 * on the same origin. When the page is opened directly there is no parent and the result stays undefined.
 */
export function useParentState(locale: Locale): StateMessage | undefined {
  const [message, setMessage] = useState<StateMessage | undefined>();

  useEffect(() => {
    if (window.parent === window) return; // opened directly: authoritative baseline, nothing to listen to
    let answered = false;
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const msg = parseStateMessage(e.data);
      if (!msg || msg.lang !== locale) return;
      answered = true;
      setMessage(msg);
    };
    window.addEventListener('message', on);
    const stopEscape = forwardEscapeToParent();
    // The parent may still be hydrating (page refresh) and miss the first "ready": repeat a few times, with growing
    // gaps (0.4, 0.8, 1.6 s), until it answers with a state. Then stop; the frame never pings in a loop.
    const ready: ReadyMessage = { type: 'ready', v: PREVIEW_PROTOCOL };
    let tries = 0;
    let timer = 0;
    const ping = () => window.parent.postMessage(ready, window.location.origin);
    const again = () => {
      timer = window.setTimeout(
        () => {
          if (answered) return;
          ping();
          if (++tries < MAX_REPEATS) again();
        },
        RETRY_MS * 2 ** tries,
      );
    };
    ping();
    again();
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', on);
      stopEscape();
    };
  }, [locale]);

  return message;
}
