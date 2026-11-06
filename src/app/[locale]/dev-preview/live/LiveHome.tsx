'use client';

import { useMemo } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { HomePage } from '@/components/HomePage';
import { ProfileLayout } from '@/components/ProfileSections';
import { Contact } from '@/components/Sections';
import type { PublicProject } from '@/content/projects/types';
import { getSiteContent, mergeSiteContent } from '@/content/site-content';
import type { Locale } from '@/content/types';
import type { NoteItem } from '@/lib/notes';
import { homeProjectCards, type ProjectCard } from '@/lib/projects';
import { resolveProjects } from '@/lib/public-snapshot';
import { useParentState } from './useParentState';

/**
 * The real Homepage tree, rendered in the browser so a draft can re-render it without a reload. The Homepage
 * components carry no server-only code (the project/notes inputs arrive as serialisable props), so the same
 * `HomePage` the public route renders runs here with `content` = mergeSiteContent(validated override).
 * Nothing is persisted.
 */
export function LiveHome({
  locale,
  projects,
  pool = [],
  notes,
  page = 'home',
}: {
  locale: Locale;
  projects: ProjectCard[];
  /** Every record the Admin may ask for by id (real published records and development samples, already public-safe). */
  pool?: PublicProject[];
  notes: NoteItem[];
  page?: 'home' | 'profile';
}) {
  const message = useParentState(locale);
  const override = message && Object.keys(message.override).length ? message.override : undefined;
  const content = useMemo(() => (override ? mergeSiteContent(override) : undefined), [override]);
  // Ids from the Admin resolve against the server-side pool; without a list the real published records stay.
  const ids = message?.projects;
  const shownProjects = useMemo(
    () => (ids ? homeProjectCards(resolveProjects(pool, ids), locale) : projects),
    [ids, pool, projects, locale],
  );
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
  return <HomePage locale={locale} content={shown} projects={shownProjects} notes={notes} preview />;
}
