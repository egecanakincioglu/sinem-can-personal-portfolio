import { describe, expect, it } from 'vitest';
import { copyFields, type CopyField } from '@/lib/preview-bridge';
import { changeLabel } from './DiffView';

describe('changeLabel', () => {
  it('never shows a raw path for a text field of the registry', () => {
    for (const f of Object.values(copyFields) as CopyField[]) {
      const path = `${f.dest === 'draft' ? 'draft' : f.dest}.${f.key}`;
      const label = changeLabel(path);
      expect(label, path).not.toMatch(/^(dict|draft)\./);
      expect(label, path).not.toBe(path);
    }
  });

  it('names a project field by label and record id', () => {
    expect(changeLabel('project.p1.title')).toMatch(/\(p1\)$/);
    expect(changeLabel('project.p1')).toBe('Proje p1');
  });
});
