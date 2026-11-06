import { describe, expect, it } from 'vitest';
import { registry } from '../app/admin/registry';
import { collectIssues, GROUP_DRAFT, GROUP_HONESTY, GROUP_VALIDATION } from './admin-issues';
import { selectPublicSnapshot } from './public-snapshot';

const issues = (values: Record<string, string>) =>
  collectIssues(values, selectPublicSnapshot({ values, projects: [] }, false), registry);

describe('collectIssues', () => {
  it('finds nothing in the untouched state', () => {
    expect(issues({})).toEqual([]);
  });

  it('reports a failing field check as a blocking error with the registry label and path', () => {
    const [issue, ...rest] = issues({ 'hero.isolation.tr': 'x'.repeat(40) });
    expect(rest).toEqual([]);
    expect(issue.severity).toBe('error');
    expect(issue.group).toBe(GROUP_VALIDATION);
    expect(issue.fieldId).toBe('hero.isolation.tr');
    expect(issue.path).toBe('dict.hero.isolation');
    expect(issue.text).toContain('En fazla 24 karakter');
  });

  it('checks contact, force, beam and portrait fields with their own rules', () => {
    const found = issues({
      'ayarlar.contact.email': 'not an address',
      'kuvvetler.F1.magnitude': '9',
      'yaklasim.a0': '4',
      'profil.portrait.zoom': '7',
    });
    expect(found.filter((i) => i.severity === 'error')).toHaveLength(4);
  });

  it('asks for acknowledgement of an edited unapproved draft text, not of an unchanged one', () => {
    const found = issues({ 'hero.lead.tr': 'Yeni bir cümle' });
    expect(found.map((i) => [i.group, i.severity])).toEqual([[GROUP_DRAFT, 'warning']]);
    expect(issues({ 'hero.isolation.tr': 'Yeni etiket' })).toEqual([]);
  });

  it('warns about honesty-lint hits in edited text only', () => {
    const found = issues({ 'hero.lead.en': 'A passionate student' });
    const honesty = found.filter((i) => i.group === GROUP_HONESTY);
    expect(honesty).toHaveLength(1);
    expect(honesty[0].severity).toBe('warning');
    expect(honesty[0].text).toContain('passionate');
    expect(honesty[0].text).toContain('(EN)');
  });
});
