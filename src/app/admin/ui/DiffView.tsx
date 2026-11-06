'use client';

import { entryFor, entryLabel } from '@/lib/field-registry';
import { excerpt, UNTITLED, type Change, type Delta } from '@/lib/publish';
import { registry } from '../registry';

/** The editor section a project field belongs to, for fields the registry has no label for. */
const PROJECT_SECTIONS: Record<string, string> = {
  title: 'Kimlik',
  slug: 'Kimlik',
  kind: 'Kimlik',
  disciplines: 'Antet',
  tools: 'Antet',
  period: 'Antet',
  status: 'Antet',
  cover: 'Görsel',
  figures: 'Şekiller',
  preview3d: '3B ve CAD',
  relatedIds: 'İlişkiler',
  visibility: 'Yayın',
  approved: 'Yayın',
  featured: 'Yayın',
  revisions: 'Revizyonlar',
};

/** Admin wording for a changed path: the registry label, or the field label with the record's title for project fields. */
export function changeLabel(path: string, title?: string): string {
  const rec = /^project\.([^.]+)(?:\.(.+))?$/.exec(path);
  if (!rec) {
    const e = entryFor(registry, path);
    return e ? entryLabel(e) : path;
  }
  const name = `Proje “${title ?? UNTITLED}”`;
  if (!rec[2]) return name;
  const e = entryFor(registry, `project.${rec[2]}`);
  return `${name} · ${e ? entryLabel(e) : (PROJECT_SECTIONS[rec[2].split(/[.[]/)[0]] ?? 'Diğer alanlar')}`;
}

const SIDES = [
  ['tr', 'TR'],
  ['en', 'EN'],
  ['shared', 'Her iki dil'],
] as const;

const RECORD_TEXT = { added: 'Yeni kayıt', removed: 'Silindi' } as const;

const shown = (text: string) => excerpt(text) || '(boş)';

/** Field-level before/after list: one row per changed field, TR and EN side by side in reading order. */
export function DiffView({ changes, label }: { changes: readonly Change[]; label: string }) {
  if (changes.length === 0) return <p className="a-help">Değişiklik yok.</p>;
  return (
    <ul className="a-diff" aria-label={label}>
      {changes.map((c) => (
        <li key={c.path} className="a-diff-row">
          <p className="a-diff-path">{c.label ?? changeLabel(c.path, c.title)}</p>
          {c.record && <p className="a-diff-side">{RECORD_TEXT[c.record]}</p>}
          {SIDES.map(([key, tag]) => {
            const d: Delta | undefined = c[key];
            return d ? (
              <p key={key} className="a-diff-side">
                <span className="a-diff-tag">{tag}</span> <del className="a-diff-before">{shown(d.before)}</del>{' '}
                <span aria-hidden="true">→</span> <ins className="a-diff-after">{shown(d.after)}</ins>
              </p>
            ) : null;
          })}
        </li>
      ))}
    </ul>
  );
}
