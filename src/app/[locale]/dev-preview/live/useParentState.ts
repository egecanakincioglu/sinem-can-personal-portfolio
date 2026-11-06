'use client';

import { useEffect, useState } from 'react';
import type { Locale } from '@/content/types';
import { PREVIEW_PROTOCOL, parseStateMessage, type ReadyMessage, type StateMessage } from '@/lib/preview-bridge';

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
    // The parent may still be hydrating (page refresh) and miss the first "ready": repeat until it answers with a state.
    const ready: ReadyMessage = { type: 'ready', v: PREVIEW_PROTOCOL };
    let tries = 0;
    const ping = () => window.parent.postMessage(ready, window.location.origin);
    ping();
    const timer = window.setInterval(() => {
      if (answered || ++tries > 25) window.clearInterval(timer);
      else ping();
    }, 400);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('message', on);
    };
  }, [locale]);

  return message;
}
