import type { ProjectRecord } from '@/content/projects/types';
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
  identityFields,
  platformFieldId,
  portraitFields,
  type CopyField,
} from './preview-bridge';
import type { MediaAsset } from './media';
import { noteIssues, type MockNote } from './note-record';
import { projectIssues } from './project-edit';
import { diffContent, UNTITLED } from './publish';
import type { PublicSnapshot } from './public-snapshot';

/** One finding about the working state. Errors block a publish; warnings need an acknowledgement. */
export type Issue = {
  group: string;
  fieldId: string;
  path: string;
  text: string;
  severity: 'error' | 'warning';
  /** Record-level findings name their record and link to its editor; field findings use the registry instead. */
  label?: string;
  where?: string;
  href?: string;
};

/** The records and the media library the record checks need. */
export type RecordSource = {
  projects: readonly ProjectRecord[];
  notes: readonly MockNote[];
  assets: readonly MediaAsset[];
  figureIds: readonly string[];
};

const LANGS = ['tr', 'en'] as const;
export const GROUP_VALIDATION = 'Doğrulama';
export const GROUP_DRAFT = 'Onaysız taslak metin';
export const GROUP_HONESTY = 'Dürüstlük denetimi';

const stripPrefix = (m: string) => m.replace(/^(?:Hata|Uyarı):\s*/, '');

/** Errors of the project and note records that would be public. A draft is unfinished by nature and cannot block a
 *  publish, and a sample never leaves development. */
function recordIssues(src: RecordSource): Issue[] {
  const out: Issue[] = [];
  for (const p of src.projects) {
    if (p.fixture || p.visibility !== 'published') continue;
    const label = `Proje “${p.title.tr.trim() || UNTITLED}”`;
    const assetIds = new Set(src.assets.flatMap((a) => [a.id, `${p.id}/${a.id}`]));
    for (const i of projectIssues(p, { records: src.projects, assetIds })) {
      if (i.severity !== 'error') continue;
      out.push({
        group: GROUP_VALIDATION,
        fieldId: `project.${p.id}.${i.field}`,
        path: `project.${p.id}.${i.field}`,
        text: `${label}: ${stripPrefix(i.message)}${i.lang ? ` (${i.lang.toUpperCase()})` : ''}`,
        severity: 'error',
        label,
        where: 'Projeler',
        href: `/admin/projeler/${encodeURIComponent(p.id)}#bolum-${i.section}`,
      });
    }
  }
  const noteCtx = { records: src.notes, figureIds: src.figureIds, assetIds: src.assets.map((a) => a.src) };
  for (const n of src.notes) {
    if (n.fixture || n.status !== 'published') continue;
    const label = `Not “${n.title.tr.trim() || UNTITLED}”`;
    for (const i of noteIssues(n, noteCtx)) {
      if (i.severity !== 'error') continue;
      out.push({
        group: GROUP_VALIDATION,
        fieldId: `note.${n.id}.${i.field}`,
        path: `note.${n.id}.${i.field}`,
        text: `${label}: ${stripPrefix(i.message)}${i.lang ? ` (${i.lang.toUpperCase()})` : ''}`,
        severity: 'error',
        label,
        where: 'Notlar',
        href: `/admin/notlar/${encodeURIComponent(n.id)}`,
      });
    }
  }
  return out;
}

const NAME_EMPTY = 'Bu alan boş bırakılamaz; önizleme varsayılan adı gösterir.';
const checkName = (k: keyof typeof identityFields, v: string): string | undefined =>
  !v.trim() ? NAME_EMPTY : v.length > identityFields[k].max ? `En fazla ${identityFields[k].max} karakter.` : undefined;

/** Everything the field checks flag, the record errors, and the draft-copy and honesty warnings. */
export function collectIssues(
  values: Record<string, string>,
  snapshot: PublicSnapshot,
  registry: readonly RegistryEntry[],
  records?: RecordSource,
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
  for (const k of ['firstName', 'lastName'] as const) {
    const fid = identityFields[k].id;
    if (fid in values) error(fid, checkName(k, values[fid]));
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
  if (records) out.push(...recordIssues(records));
  return out;
}
