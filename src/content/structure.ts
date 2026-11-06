import type { PageKey } from '@/lib/routes';

// Structural constants (Admin class S): not editable content, but defined once so Header, Footer,
// the Profile index and the pages cannot drift apart. Ids are language-neutral so #hash survives a language switch.

/** Primary navigation keys, in order. Labels live in dict.nav. */
export const navKeys = ['profile', 'projects', 'notes', 'contact'] as const;
export type NavKey = (typeof navKeys)[number];

/** Sections the running head follows, per page (first id = initial section). */
export const sectionIds: Record<PageKey, readonly string[]> = {
  home: ['top', 'profile', 'forces', 'workshop', 'approach', 'work', 'direction', 'contact'],
  profile: [
    'intro',
    'education',
    'experience',
    'community',
    'skills',
    'languages',
    'interests',
    'off-field',
    'contact',
  ],
  projects: ['archive', 'contact'],
  project: ['project', 'contact'],
  notes: ['archive', 'contact'],
  note: ['note-top', 'contact'], // an article's own sections are passed in and arrive through SECTION_EVENT
};

/** Entries of the Profile page index, in order. */
export const profileIndexIds = [
  'intro',
  'education',
  'experience',
  'community',
  'skills',
  'languages',
  'interests',
  'off-field',
] as const;

/** Footer "Sheet" cell: which dict.sections key names the current page. */
export const sheetKeys: Record<PageKey, string> = {
  home: 'top',
  profile: 'intro',
  projects: 'archive',
  project: 'project',
  notes: 'archive',
  note: 'note',
};
