'use client';

import { entryFor, entryLabel } from '@/lib/field-registry';
import { excerpt, type Change, type Delta } from '@/lib/publish';
import { registry } from '../registry';

/** Admin wording for a changed path: the registry label, or the record id for project fields. */
export function changeLabel(path: string): string {
  const rec = /^project\.([^.]+)(?:\.(.+))?$/.exec(path);
  if (!rec) {
    const e = entryFor(registry, path);
    return e ? entryLabel(e) : path;
  }
  if (!rec[2]) return `Proje ${rec[1]}`;
  const e = entryFor(registry, `project.${rec[2]}`);
  return `${e ? entryLabel(e) : rec[2]} (${rec[1]})`;
}

const SIDES = [
  ['tr', 'TR'],
  ['en', 'EN'],
  ['shared', 'Ortak'],
] as const;

const shown = (text: string) => excerpt(text) || '(boş)';

/** Field-level before/after list: one row per changed field, TR and EN side by side in reading order. */
export function DiffView({ changes, label }: { changes: readonly Change[]; label: string }) {
  if (changes.length === 0) return <p className="a-help">Değişiklik yok.</p>;
  return (
    <ul className="a-diff" aria-label={label}>
      {changes.map((c) => (
        <li key={c.path} className="a-diff-row">
          <p className="a-diff-path">{c.label ?? changeLabel(c.path)}</p>
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
