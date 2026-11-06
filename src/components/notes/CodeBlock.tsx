'use client';

import { useEffect, useState } from 'react';

type Props = {
  code: string;
  lang?: string;
  filename?: string;
  copy: string;
  copied: string;
  failed: string;
  label: string;
};

/** Fenced code on a Pafta ground, system monospace. Copy announces its result through aria-live. */
export function CodeBlock({ code, lang, filename, copy, copied, failed, label }: Props) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const t = setTimeout(() => setStatus('idle'), 2400);
    return () => clearTimeout(t);
  }, [status]);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus('ok');
    } catch {
      setStatus('fail');
    }
  }

  return (
    <figure className="art-wide art-code">
      <div className="flex items-center justify-between gap-4 border-b border-cizgi pl-4 pr-1">
        <span className="t-meta truncate">{[filename, lang].filter(Boolean).join(' · ') || label}</span>
        <span className="flex shrink-0 items-center gap-3">
          <span role="status" aria-live="polite" className="t-caption">
            {status === 'ok' ? copied : status === 'fail' ? failed : ''}
          </span>
          <button
            type="button"
            onClick={onCopy}
            aria-label={`${copy}: ${filename ?? lang ?? label}`}
            className="cta min-h-11 min-w-11 justify-center text-[14px]"
          >
            <span className="label">{copy}</span>
          </button>
        </span>
      </div>
      <pre tabIndex={0} aria-label={`${label}${filename ? `: ${filename}` : ''}`}>
        <code>{code}</code>
      </pre>
    </figure>
  );
}
