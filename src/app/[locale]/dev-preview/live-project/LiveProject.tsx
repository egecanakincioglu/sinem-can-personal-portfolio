'use client';

import { useEffect, useMemo } from 'react';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { ProjectDetail } from '@/components/projects/ProjectDetail';
import { ProjectsArchive } from '@/components/projects/ProjectsArchive';
import { Contact } from '@/components/Sections';
import type { PublicProject } from '@/content/projects/types';
import { getSiteContent, mergeSiteContent } from '@/content/site-content';
import type { Locale } from '@/content/types';
import { glbModelUrl } from '@/lib/glb';
import { resolveProjects } from '@/lib/public-snapshot';
import { useParentState } from '../live/useParentState';

/**
 * The real project archive, rendered in the browser so the Admin can change what it shows without a reload.
 * `projects` is the baseline (real published records); a state message from the Admin replaces it with the pool
 * records named by id. A model probe swaps the archive for that record's page with the library model it names: the
 * library id maps to an address here, so no address crosses the bridge. Nothing is persisted.
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
  const probe = message?.probe;
  const probed = useMemo(() => {
    const record = probe && pool.find((p) => p.id === probe.id);
    if (!record || !probe) return undefined;
    const pre = record.preview3d;
    // Same rule as the public site: a preview that is not approved, or has no model, is not shown at all.
    return {
      ...record,
      preview3d:
        pre && probe.glb && probe.approved
          ? { ...pre, approved: true, modelSrc: glbModelUrl(probe.glb), sizeBytes: undefined }
          : undefined,
    };
  }, [probe, pool]);
  useEffect(() => {
    if (probed) document.getElementById('preview3d')?.scrollIntoView?.();
  }, [probed]);
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
        {probed ? (
          <ProjectDetail project={probed} locale={locale} dict={shown.dict} />
        ) : (
          <ProjectsArchive locale={locale} projects={list} content={shown} />
        )}
        <Contact locale={locale} content={shown} />
      </main>
      <Footer locale={locale} page="projects" content={shown} />
    </>
  );
}
