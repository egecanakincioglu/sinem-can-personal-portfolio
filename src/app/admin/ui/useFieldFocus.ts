'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const RETRIES = 20;

/** Deep link `?alan=<id>`: scrolls to the editor control marked `data-field="<id>"` and focuses it. A bilingual id
 *  without a language suffix lands on the Turkish side; a control inside a hidden language tab opens that tab. */
export function useFieldFocus() {
  const alan = useSearchParams().get('alan');
  useEffect(() => {
    if (!alan) return;
    const pick = (id: string) => document.querySelector<HTMLElement>(`[data-field="${id.replace(/["\\]/g, '\\$&')}"]`);
    let timer = 0;
    let tries = 0;
    const go = () => {
      const el = pick(alan) ?? pick(`${alan}.tr`);
      if (!el) {
        // The editor mounts after the stored state has been read.
        if (++tries < RETRIES) timer = window.setTimeout(go, 100);
        return;
      }
      const pane = el.closest<HTMLElement>('[role="tabpanel"]');
      const hidden = !!pane && !pane.classList.contains('is-shown');
      if (pane && hidden) document.getElementById(pane.getAttribute('aria-labelledby') ?? '')?.click();
      timer = window.setTimeout(
        () => {
          el.scrollIntoView({ block: 'center' });
          el.focus({ preventScroll: true });
        },
        hidden ? 50 : 0,
      );
    };
    go();
    return () => window.clearTimeout(timer);
  }, [alan]);
}
