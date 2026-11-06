'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

const RETRIES = 20;

/** Centres the control in the editor column by scrolling that column only. `scrollIntoView` would also scroll the
 *  clipped frame around it and push the toolbar out of sight. Without a scrolling column (small screens) the page scrolls. */
function reveal(el: HTMLElement) {
  const main = el.closest<HTMLElement>('.a-main');
  if (!main || main.scrollHeight <= main.clientHeight || getComputedStyle(main).overflowY === 'visible') {
    el.scrollIntoView({ block: 'center' });
    return;
  }
  const barH = main.querySelector<HTMLElement>('.a-bar')?.offsetHeight ?? 0;
  const top = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop;
  main.scrollTop = Math.max(0, top - barH - (main.clientHeight - barH - el.offsetHeight) / 2);
}

/** A jump leaves the caret after the existing text so typing continues it. */
function caretToEnd(el: HTMLElement) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  try {
    el.setSelectionRange(el.value.length, el.value.length);
  } catch {
    // Types without a text selection (number, email, date) have no caret to place.
  }
}

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
          reveal(el);
          el.focus({ preventScroll: true });
          caretToEnd(el);
        },
        hidden ? 50 : 0,
      );
    };
    go();
    return () => window.clearTimeout(timer);
  }, [alan]);
}
