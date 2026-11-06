import { getSiteContent } from '@/content/site-content';
import { entryFor, entryLabel, type RegistryEntry } from './field-registry';
import { lintText } from './honesty-lint';
import {
  FORCE_IDS,
  beamLoadField,
  checkBeamLoad,
  checkCopy,
  checkEmail,
  checkForceNumber,
  checkHandle,
  checkPlatformUrl,
  checkPortraitNumber,
  contactFields,
  copyDefault,
  copyFields,
  forceFieldId,
  platformFieldId,
  portraitFields,
  type CopyField,
} from './preview-bridge';
import { diffContent } from './publish';
import type { PublicSnapshot } from './public-snapshot';

/** One finding about the working state. Errors block a publish; warnings need an acknowledgement. */
export type Issue = {
  group: string;
  fieldId: string;
  path: string;
  text: string;
  severity: 'error' | 'warning';
};

const LANGS = ['tr', 'en'] as const;
export const GROUP_VALIDATION = 'Doğrulama';
export const GROUP_DRAFT = 'Onaysız taslak metin';
export const GROUP_HONESTY = 'Dürüstlük denetimi';

/** Everything the field checks flag, plus the draft-copy and honesty warnings, for the working values. */
export function collectIssues(
  values: Record<string, string>,
  snapshot: PublicSnapshot,
  registry: readonly RegistryEntry[],
): Issue[] {
  const out: Issue[] = [];
  const ownerOf = (fieldId: string) =>
    registry.find((e) => e.id === fieldId) ?? registry.find((e) => e.id === fieldId.replace(/\.(tr|en)$/, ''));
  const add = (fieldId: string, text: string, severity: Issue['severity'], group: string) => {
    const e = ownerOf(fieldId);
    out.push({ group, fieldId, path: e?.path ?? fieldId, text: `${e ? entryLabel(e) : fieldId}: ${text}`, severity });
  };
  const error = (fieldId: string, message: string | undefined) => {
    if (message) add(fieldId, message, 'error', GROUP_VALIDATION);
  };

  for (const f of Object.values(copyFields) as CopyField[]) {
    for (const l of LANGS) {
      const id = `${f.id}.${l}`;
      const v = values[id];
      if (v === undefined) continue;
      error(id, checkCopy(f, v));
      if (f.dest === 'draft' && v.trim() && v !== copyDefault(f)[l])
        add(id, `${l.toUpperCase()} metni onaysız taslak.`, 'warning', GROUP_DRAFT);
    }
  }
  if (contactFields.email in values) error(contactFields.email, checkEmail(values[contactFields.email]));
  for (const p of snapshot.content.platforms) {
    const url = platformFieldId(p.id, 'url');
    const handle = platformFieldId(p.id, 'handle');
    if (url in values) error(url, checkPlatformUrl(p.id, values[url]));
    if (handle in values) error(handle, checkHandle(values[handle]));
  }
  for (const id of FORCE_IDS)
    for (const kind of ['magnitude', 'angle'] as const) {
      const fid = forceFieldId(id, kind);
      if (fid in values) error(fid, checkForceNumber(kind, values[fid]));
    }
  if (beamLoadField.id in values) error(beamLoadField.id, checkBeamLoad(values[beamLoadField.id]));
  for (const k of ['focalX', 'focalY', 'zoom'] as const) {
    const fid = portraitFields[k].id;
    if (fid in values) error(fid, checkPortraitNumber(k, values[fid]));
  }

  // The honesty scan reads what the public site would show, but only where it differs from today's text.
  for (const c of diffContent(getSiteContent(), snapshot.content)) {
    const e = entryFor(registry, c.path);
    for (const key of ['tr', 'en', 'shared'] as const) {
      for (const hit of lintText(c[key]?.after ?? '')) {
        const where = key === 'shared' ? '' : ` (${key.toUpperCase()})`;
        out.push({
          group: GROUP_HONESTY,
          fieldId: e?.id ?? c.path,
          path: c.path,
          text: `${e ? entryLabel(e) : c.path}${where}: “${hit.match}” — ${hit.rule}`,
          severity: 'warning',
        });
      }
    }
  }
  return out;
}
