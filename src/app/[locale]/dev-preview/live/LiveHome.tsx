'use client';

import { useEffect, useMemo, useState } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HomePage } from '@/components/HomePage';
import { ProfileLayout } from '@/components/ProfileSections';
import { Contact } from '@/components/Sections';
import { getSiteContent, mergeSiteContent, type SiteContentOverride } from '@/content/site-content';
import type { Locale } from '@/content/types';
import type { NoteItem } from '@/lib/notes';
import { PREVIEW_PROTOCOL, parseStateMessage, type ReadyMessage } from '@/lib/preview-bridge';
import type { ProjectCard } from '@/lib/projects';

/**
 * The real Homepage tree, rendered in the browser so a draft can re-render it without a reload. The Homepage
 * components carry no server-only code (the project/notes inputs arrive as serialisable props), so the same
 * `HomePage` the public route renders runs here with `content` = mergeSiteContent(validated override).
 * Messages are accepted only from the embedding parent window on the same origin. Nothing is persisted.
 */
export function LiveHome({
  locale,
  projects,
  notes,
  page = 'home',
}: {
  locale: Locale;
  projects: ProjectCard[];
  notes: NoteItem[];
  page?: 'home' | 'profile';
}) {
  const [override, setOverride] = useState<SiteContentOverride | undefined>();

  useEffect(() => {
    if (window.parent === window) return; // opened directly: authoritative baseline, nothing to listen to
    let answered = false;
    const on = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== window.parent) return;
      const msg = parseStateMessage(e.data);
      if (!msg || msg.lang !== locale) return;
      answered = true;
      setOverride(Object.keys(msg.override).length ? msg.override : undefined);
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

  const content = useMemo(() => (override ? mergeSiteContent(override) : undefined), [override]);
  const shown = content ?? getSiteContent();
  if (page === 'profile') {
    // The real Profile page tree (same composition as app/[locale]/[slug]/page.tsx), fed by the same merged content.
    return (
      <>
        <Header
          locale={locale}
          page="profile"
          ownerName={content?.ownerName}
          email={content?.contact.email}
          copy={content?.dict}
        />
        <main id="main">
          <ProfileLayout locale={locale} content={shown} />
          <Contact locale={locale} content={shown} />
        </main>
        <Footer locale={locale} page="profile" content={shown} />
      </>
    );
  }
  return <HomePage locale={locale} content={shown} projects={projects} notes={notes} preview />;
}
