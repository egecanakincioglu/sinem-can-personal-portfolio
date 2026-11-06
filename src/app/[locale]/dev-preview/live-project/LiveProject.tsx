'use client';

import { useMemo } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ProjectsArchive } from '@/components/projects/ProjectsArchive';
import { Contact } from '@/components/Sections';
import type { PublicProject } from '@/content/projects/types';
import { getSiteContent, mergeSiteContent } from '@/content/site-content';
import type { Locale } from '@/content/types';
import { resolveProjects } from '@/lib/public-snapshot';
import { useParentState } from '../live/useParentState';

/**
 * The real project archive, rendered in the browser so the Admin can change what it shows without a reload.
 * `projects` is the baseline (real published records); a state message from the Admin replaces it with the pool
 * records named by id. Nothing is persisted.
 */
export function LiveProject({
  locale,
  projects,
  pool,
}: {
  locale: Locale;
  projects: PublicProject[];
  pool: PublicProject[];
}) {
  const message = useParentState(locale);
  const override = message && Object.keys(message.override).length ? message.override : undefined;
  const content = useMemo(() => (override ? mergeSiteContent(override) : undefined), [override]);
  const shown = content ?? getSiteContent();
  const ids = message?.projects;
  const list = useMemo(() => (ids ? resolveProjects(pool, ids) : projects), [ids, pool, projects]);
  return (
    <>
      <Header
        locale={locale}
        page="projects"
        ownerName={content?.ownerName}
        email={content?.contact.email}
        copy={content?.dict}
      />
      <main id="main">
        <ProjectsArchive locale={locale} projects={list} content={shown} />
        <Contact locale={locale} content={shown} />
      </main>
      <Footer locale={locale} page="projects" content={shown} />
    </>
  );
}
