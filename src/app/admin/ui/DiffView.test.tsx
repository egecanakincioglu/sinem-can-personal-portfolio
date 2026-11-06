import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { copyFields, type CopyField } from '@/lib/preview-bridge';
import { changeLabel, DiffView } from './DiffView';

describe('changeLabel', () => {
  it('never shows a raw path for a text field of the registry', () => {
    for (const f of Object.values(copyFields) as CopyField[]) {
      const path = `${f.dest === 'draft' ? 'draft' : f.dest}.${f.key}`;
      const label = changeLabel(path);
      expect(label, path).not.toMatch(/^(dict|draft)\./);
      expect(label, path).not.toBe(path);
    }
  });

  it('names a project field by the record title, never by its id', () => {
    expect(changeLabel('project.p1.title', 'Kiriş')).toMatch(/^Proje “Kiriş” · /);
    expect(changeLabel('project.p1.title', 'Kiriş')).not.toContain('p1');
    expect(changeLabel('project.p1.title')).toMatch(/^Proje “Başlıksız kayıt” · /);
    expect(changeLabel('project.p1', 'Kiriş')).toBe('Proje “Kiriş”');
    expect(changeLabel('project.p1.preview3d.sizeBytes', 'Kiriş')).toBe('Proje “Kiriş” · 3B ve CAD');
    expect(changeLabel('project.p1.zzz[0].x', 'Kiriş')).toBe('Proje “Kiriş” · Diğer alanlar');
  });
});

describe('DiffView', () => {
  it('words an added and a removed record plainly, with no id and no dash', () => {
    render(
      <DiffView
        label="Fark"
        changes={[
          { path: 'project.p1', label: 'Proje “Kiriş”', record: 'added' },
          { path: 'note.n1', label: 'Not “Sehim”', record: 'removed' },
        ]}
      />,
    );
    const rows = within(screen.getByRole('list', { name: 'Fark' })).getAllByRole('listitem');
    expect(rows[0].textContent).toBe('Proje “Kiriş”Yeni kayıt');
    expect(rows[1].textContent).toBe('Not “Sehim”Silindi');
    expect(screen.queryByText('—')).toBeNull();
  });

  it('labels a shared field "Her iki dil" and keeps TR and EN apart', () => {
    render(
      <DiffView
        label="Fark"
        changes={[
          {
            path: 'project.p1.title',
            title: 'Kiriş',
            tr: { before: 'a', after: 'b' },
            en: { before: 'c', after: 'd' },
          },
          { path: 'project.p1.year', title: 'Kiriş', shared: { before: '2025', after: '2026' } },
        ]}
      />,
    );
    expect(screen.getByText('TR')).toBeTruthy();
    expect(screen.getByText('EN')).toBeTruthy();
    expect(screen.getByText('Her iki dil')).toBeTruthy();
    expect(screen.queryByText('Ortak')).toBeNull();
    expect(screen.getAllByText(/^Proje “Kiriş” · /)).toHaveLength(2);
  });
});
