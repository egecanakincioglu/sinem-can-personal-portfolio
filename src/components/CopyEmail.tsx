'use client';

import { useEffect, useState } from 'react';

type Props = { email: string; label: string; copied: string; failed: string; ariaLabel: string };

export function CopyEmail({ email, label, copied, failed, ariaLabel }: Props) {
  const [status, setStatus] = useState<'idle' | 'ok' | 'fail'>('idle');

  useEffect(() => {
    if (status === 'idle') return;
    const t = setTimeout(() => setStatus('idle'), 2400);
    return () => clearTimeout(t);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setStatus('ok');
    } catch {
      setStatus('fail');
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button type="button" onClick={copy} aria-label={ariaLabel} className="cta min-h-11 px-1 text-[15px]">
        <span className="label">{label}</span>
      </button>
      <span role="status" aria-live="polite" className="t-caption min-w-[6.5rem]">
        {status === 'ok' ? copied : status === 'fail' ? failed : ''}
      </span>
    </span>
  );
}
