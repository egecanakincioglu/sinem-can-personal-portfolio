'use client';

import { useEffect } from 'react';
import { PREVIEW_PROTOCOL, type ReadyMessage } from '@/lib/preview-bridge';

/** Placeholder for screens whose real preview is not connected yet (only Ana sayfa is). It speaks the same handshake and ignores state. */
export function PreviewSkeleton({ path }: { path: string }) {
  useEffect(() => {
    if (window.parent === window) return;
    const ready: ReadyMessage = { type: 'ready', v: PREVIEW_PROTOCOL };
    window.parent.postMessage(ready, window.location.origin);
  }, []);
  return (
    <main className="a-pv">
      <p className="a-ph-k">Önizleme · {path}</p>
      <h1 className="a-pv-t">Bu ekranın canlı önizlemesi henüz bağlı değil.</h1>
      <p className="a-prose">
        Yalnızca Ana sayfa gerçek bileşenlerle önizlenir. Diğer ekranların önizlemesi kendi aşamasında bağlanacak.
      </p>
    </main>
  );
}
