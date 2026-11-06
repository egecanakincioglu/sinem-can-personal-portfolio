import type { NoteRecord } from './types';

/**
 * THE single source of public note content.
 *
 * Only articles Sinem has written AND approved belong here. None exist yet, so the public archive is the
 * designed empty state. Do not add placeholder or invented articles: development samples live in
 * content/fixtures/ and are never imported from this file.
 */
export const noteRecords: NoteRecord[] = [];
