'use client';

import { useId, useState } from 'react';

const WORD_JOINER = String.fromCodePoint(0x2060);

/**
 * Margin note. ≥1024px: always visible in the rail (CSS), the mark is a plain superscript.
 * <1024px: the mark is a real button that opens the note inline (no tooltip, no popover).
 */
export function Sidenote({ n, label, children }: { n: string; label?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={label ? 'sn' : 'sn sn-nowrap'}>
      {/* word joiner: the mark never wraps onto a line of its own */}
      {WORD_JOINER}
      <button
        type="button"
        className={label ? 'sn-mark sn-mark--label' : 'sn-mark'}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
      >
        {n}
        {label ? <span className="sn-label font-serif italic"> {label}</span> : null}
      </button>
      <span id={id} className="sn-body" data-open={open}>
        <sup className="mr-1 text-grafit">{n}</sup>
        {children}
      </span>
    </span>
  );
}
