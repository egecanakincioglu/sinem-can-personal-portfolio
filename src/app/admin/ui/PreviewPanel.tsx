'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PREVIEW_PROTOCOL, buildOverride, type StateMessage } from '@/lib/preview-bridge';
import { devices } from '../screens';
import { Segmented } from './controls';
import { useAdmin } from './store';

/** Right panel: same-origin iframe at true device width, scaled to fit. State goes in by postMessage. */
export function PreviewPanel({ route, title, onClose }: { route: string; title: string; onClose: () => void }) {
  const { state, setDevice, setPreviewLang } = useAdmin();
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [hello, setHello] = useState(0);
  const [fx, setFx] = useState(false); // dev harness: /admin/ana-sayfa?fixtures=1 previews the sample (published + approved) projects
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the query string is only readable in the browser; reading it during render would break hydration
    setFx(new URLSearchParams(window.location.search).get('fixtures') === '1');
  }, []);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Handshake: every "ready" from the frame (first load, reload, hot reload) bumps `hello`, which re-sends the state.
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: unknown; v?: unknown } | null;
      if (d?.type === 'ready' && d.v === PREVIEW_PROTOCOL) {
        setReady(true);
        setHello((n) => n + 1);
      }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);

  const frameKey = `${route}|${state.previewLang}`;
  const [seenFrameKey, setSeenFrameKey] = useState(frameKey);
  if (seenFrameKey !== frameKey) {
    setSeenFrameKey(frameKey);
    setReady(false);
  }

  // The editor values become a validated SiteContentOverride (lib/preview-bridge.ts); the frame validates it again.
  const override = useMemo(() => buildOverride(state.values), [state.values]);

  // Debounced snapshot to the iframe (120 ms), exact same-origin target.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      const msg: StateMessage = { type: 'state', v: PREVIEW_PROTOCOL, lang: state.previewLang, override };
      frame.current?.contentWindow?.postMessage(msg, window.location.origin);
    }, 120);
    return () => window.clearTimeout(t);
  }, [ready, hello, override, state.previewLang]);

  const dev = state.device;
  const PAD = 24,
    CAP = 28; // well padding (12 × 2) and caption row
  const k = box.w ? Math.min(1, (box.w - PAD - 2) / dev) : 1;
  // The iframe's viewport height is what 100svh-based sections (the hero) measure against, so it must be a real
  // device height, not "whatever fills the well after scaling". Frame height = that × scale, capped by the well.
  const DEVICE_H: Record<number, number> = { 390: 844, 768: 1024, 1440: 900, 1920: 1080 };
  const vh = DEVICE_H[dev] ?? 900;
  const frameH = Math.max(0, Math.min(box.h - PAD - CAP, vh * k + 2));
  const label = devices.find((d) => d.id === dev)!.label;

  return (
    <div className="a-prev">
      <div className="a-prev-bar">
        <div className="a-prev-title">
          <h2 className="a-panel-k" id="a-prev-h">
            Canlı önizleme
          </h2>
          <button type="button" className="a-btn a-prev-close" onClick={onClose}>
            Düzenlemeye dön
          </button>
        </div>
        <div className="a-prev-ctl">
          <Segmented
            label="Önizleme genişliği"
            value={dev}
            onChange={setDevice}
            options={devices.map((d) => ({ value: d.id, label: d.label }))}
          />
          <Segmented
            label="Önizleme dili"
            value={state.previewLang}
            onChange={setPreviewLang}
            options={[
              { value: 'tr', label: 'TR' },
              { value: 'en', label: 'EN' },
            ]}
          />
        </div>
      </div>
      <div className="a-prev-well" ref={wrap}>
        <div className="a-prev-frame" style={{ width: dev * k + 2, height: frameH }}>
          <iframe
            ref={frame}
            title={`Canlı önizleme: ${title}, ${state.previewLang.toUpperCase()}, ${dev} piksel`}
            src={
              route === 'ana-sayfa'
                ? `/${state.previewLang}/dev-preview/live${fx ? '?fx=1' : ''}`
                : route === 'profil'
                  ? `/${state.previewLang}/dev-preview/live-profile`
                  : `/admin/onizleme/${route}?lang=${state.previewLang}`
            }
            style={{ width: dev, height: Math.min((frameH - 2) / k, vh), transform: `scale(${k})` }}
          />
        </div>
        <p className="a-prev-cap">
          {label} · {dev} px{state.dirty ? ' · Önizleme · kaydedilmemiş mock veri' : ''}
        </p>
      </div>
    </div>
  );
}
