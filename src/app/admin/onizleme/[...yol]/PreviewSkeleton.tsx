'use client';

import { useEffect } from 'react';
import { PREVIEW_PROTOCOL, type ReadyMessage } from '@/lib/preview-bridge';

/** Placeholder for screens without a live preview. It speaks the same handshake and ignores state. */
export function PreviewSkeleton({ path }: { path: string }) {
  useEffect(() => {
    if (window.parent === window) return;
    const ready: ReadyMessage = { type: 'ready', v: PREVIEW_PROTOCOL };
    window.parent.postMessage(ready, window.location.origin);
  }, []);
  return (
    <main className="a-pv">
      <p className="a-ph-k">Önizleme · {path}</p>
      <h1 className="a-pv-t">Bu ekran için canlı önizleme yok.</h1>
    </main>
  );
}
