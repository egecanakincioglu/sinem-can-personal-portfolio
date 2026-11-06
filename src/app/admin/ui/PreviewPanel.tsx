'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { glbIdOf } from '@/lib/glb';
import {
  PREVIEW_PROTOCOL,
  buildOverride,
  isCloseMessage,
  type ModelProbe,
  type StateMessage,
} from '@/lib/preview-bridge';
import { devices } from '../screens';
import { Segmented } from './controls';
import { useAdmin } from './store';
import { useMedia } from './useMedia';

// Preview routes backed by real public components; the others show a plain placeholder without controls.
const LIVE_ROUTES = ['ana-sayfa', 'profil', 'projeler'];
// A "ready" repeat within this window of a send is not answered with another full send.
const REPEAT_WINDOW = 1500;

const PREVIEW_DEBOUNCE_MS = 250;

/** Right panel: same-origin iframe at true device width, scaled to fit. State goes in by postMessage. */
export function PreviewPanel({
  route,
  title,
  onClose,
  overlay = false,
}: {
  route: string;
  title: string;
  onClose: () => void;
  /** True while the panel is the open modal overlay (below 1024); only then can the frame's Escape close it. */
  overlay?: boolean;
}) {
  const { state, previewValues, previewSnapshot, setDevice, setPreviewLang, setPreviewSource } = useAdmin();
  const wrap = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [ready, setReady] = useState(false);
  const [hello, setHello] = useState(0);
  const phone = useMedia('(max-width: 767.98px)');
  const connected = LIVE_ROUTES.includes(route);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  // Handshake: a "ready" from the frame (first load, reload, hot reload) bumps `hello`, which re-sends the state.
  // The frame repeats its "ready" a few times while it waits; one that arrives right after a send is such a repeat
  // (the state is already on its way), so it does not trigger another full send.
  const sentAt = useRef(0);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as { type?: unknown; v?: unknown } | null;
      if (d?.type === 'ready' && d.v === PREVIEW_PROTOCOL) {
        setReady(true);
        if (Date.now() - sentAt.current > REPEAT_WINDOW) setHello((n) => n + 1);
      }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, []);

  // Escape pressed inside the frame never reaches the editor's document; the frame forwards it, and it closes the
  // overlay only while the overlay is open and only when it comes from this frame.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!overlay) return;
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if (isCloseMessage(e.data)) closeRef.current();
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [overlay]);

  const frameKey = `${route}|${state.previewLang}`;
  const [seenFrameKey, setSeenFrameKey] = useState(frameKey);
  if (seenFrameKey !== frameKey) {
    setSeenFrameKey(frameKey);
    setReady(false);
  }
  useEffect(() => {
    sentAt.current = 0; // a new frame has received nothing yet
  }, [frameKey]);

  // The editor values become a validated SiteContentOverride (lib/preview-bridge.ts); the frame validates it again.
  // The footer date is the simulated publish date, never a typed value.
  const published = state.published?.at.slice(0, 10);
  const override = useMemo(
    () => ({ ...buildOverride(previewValues), ...(published ? { lastRevision: published } : {}) }),
    [previewValues, published],
  );

  // Record ids only: the frame resolves them against its own server-side pool, so no record crosses the bridge.
  const projectIds = previewSnapshot.publicIds;

  // A 3D preview being tried: the record id, the library id of its model and the approval flag, nothing else.
  const probe = useMemo<ModelProbe | undefined>(() => {
    const p = state.probe ? state.projects.find((r) => r.id === state.probe) : undefined;
    return p ? { id: p.id, glb: glbIdOf(p.preview3d?.modelSrc), approved: p.preview3d?.approved === true } : undefined;
  }, [state.probe, state.projects]);

  // Debounced snapshot to the iframe, exact same-origin target. The frame shares the editor's main thread, so it is
  // updated once typing pauses instead of between keystrokes.
  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => {
      const msg: StateMessage = {
        type: 'state',
        v: PREVIEW_PROTOCOL,
        lang: state.previewLang,
        override,
        projects: projectIds,
        ...(probe ? { probe } : {}),
      };
      frame.current?.contentWindow?.postMessage(msg, window.location.origin);
      sentAt.current = Date.now();
    }, PREVIEW_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [ready, hello, override, projectIds, probe, state.previewLang]);

  const dev = state.device;
  // Well padding (12 × 2) and the frame border; on a phone both are dropped so the 390 frame fills the width unscaled.
  const PAD = phone ? 0 : 24,
    CAP = 28, // caption row
    BORDER = phone ? 0 : 2;
  const k = box.w ? Math.min(1, (box.w - PAD - BORDER) / dev) : 1;
  // The iframe's viewport height is what 100svh-based sections (the hero) measure against, so it must be a real
  // device height, not "whatever fills the well after scaling". Frame height = that × scale, capped by the well.
  const DEVICE_H: Record<number, number> = { 390: 844, 768: 1024, 1440: 900, 1920: 1080 };
  const vh = DEVICE_H[dev] ?? 900;
  const frameH = Math.max(0, Math.min(box.h - PAD - CAP, vh * k + BORDER));
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
        {connected && (
          <div className="a-prev-ctl">
            <div className="a-prev-dev">
              <Segmented
                label="Önizleme genişliği"
                value={dev}
                onChange={setDevice}
                options={devices.map((d) => ({ value: d.id, label: d.label, short: String(d.id) }))}
              />
            </div>
            <div className="a-prev-src">
              <Segmented
                label="Önizleme kaynağı"
                value={state.previewSource}
                onChange={setPreviewSource}
                options={[
                  { value: 'draft', label: 'Taslak' },
                  { value: 'published', label: 'Yayınlanan (sim.)', short: 'Yayın' },
                ]}
              />
            </div>
            <div className="a-prev-lang">
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
        )}
      </div>
      <div className="a-prev-well" ref={wrap}>
        <div className="a-prev-frame" style={{ width: dev * k + BORDER, height: frameH }}>
          <iframe
            ref={frame}
            title={`Canlı önizleme: ${title}, ${state.previewLang.toUpperCase()}, ${dev} piksel`}
            src={
              route === 'ana-sayfa'
                ? `/${state.previewLang}/dev-preview/live`
                : route === 'profil'
                  ? `/${state.previewLang}/dev-preview/live-profile`
                  : route === 'projeler'
                    ? `/${state.previewLang}/dev-preview/live-project`
                    : `/admin/onizleme/${route}?lang=${state.previewLang}`
            }
            style={{ width: dev, height: Math.min((frameH - BORDER) / k, vh), transform: `scale(${k})` }}
          />
        </div>
        {connected && (
          <p className="a-prev-cap">
            {label} · {dev} px
            {state.previewSource === 'published'
              ? state.published
                ? ' · Yayınlanan (sim.) revizyon'
                : ' · Henüz yayın simüle edilmedi; taslak gösteriliyor'
              : state.dirty
                ? ' · Önizleme · kaydedilmemiş mock veri'
                : ''}
          </p>
        )}
      </div>
    </div>
  );
}
