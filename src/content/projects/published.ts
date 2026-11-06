import type { ProjectRecord } from './types';

/**
 * THE single source of public project content.
 *
 * Only records Sinem has supplied AND approved belong here. None have been provided yet, so the
 * public archive is the designed empty state. Do not add placeholder or invented projects:
 * development samples live in content/fixtures/ and are never imported from this file.
 */
export const projectRecords: ProjectRecord[] = [];
