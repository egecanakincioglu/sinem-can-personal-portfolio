import type { ProjectRecord } from '@/content/projects/types';
import type { NoteRecord } from '@/content/notes/types';

/* ------------------------------------------------------------------------------------------------
   The one visibility rule: published AND approved AND (not a fixture OR development).
   The dev flag is always passed in, so the rule has no hidden input. Records name the state field
   differently (`visibility` for projects, `status` for notes); both names stay until the backend schema.
   ------------------------------------------------------------------------------------------------ */

const visible = (state: string, approved: boolean | undefined, fixture: boolean | undefined, dev: boolean) =>
  state === 'published' && approved === true && (!fixture || dev);

export const isPublicProject = (p: ProjectRecord, dev: boolean) =>
  visible(p.visibility, 'approved' in p ? p.approved : undefined, p.fixture, dev);

export const isPublicNote = (n: NoteRecord, dev: boolean) => visible(n.status, n.approved, n.fixture, dev);
