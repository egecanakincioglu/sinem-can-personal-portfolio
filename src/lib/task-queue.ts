import { GROUP_DRAFT, GROUP_HONESTY, GROUP_VALIDATION, type Issue } from './admin-issues';
import { entryLabel, type RegistryEntry } from './field-registry';

/** The queue groups in their fixed order. A group with no rows is not shown. */
const TASK_GROUPS = [
  'Eksik çeviri',
  'Onay bekleyen metinler',
  'Hatalar',
  'Uyarılar',
  'Yayın hazırlığı',
  'Çoğaltılmış değer',
] as const;
type TaskGroup = (typeof TASK_GROUPS)[number];

export type TaskGroupRows = { group: TaskGroup; issues: Issue[] };

const GROUP_OF: Record<string, TaskGroup> = {
  [GROUP_VALIDATION]: 'Hatalar',
  [GROUP_DRAFT]: 'Onay bekleyen metinler',
  [GROUP_HONESTY]: 'Uyarılar',
};

const groupOf = (i: Issue): TaskGroup =>
  GROUP_OF[i.group] ?? TASK_GROUPS.find((g) => g === i.group) ?? (i.severity === 'error' ? 'Hatalar' : 'Uyarılar');

/** Issues split into the queue groups, in group order. Empty groups are left out. */
export function groupIssues(issues: readonly Issue[]): TaskGroupRows[] {
  return TASK_GROUPS.map((group) => ({ group, issues: issues.filter((i) => groupOf(i) === group) })).filter(
    (g) => g.issues.length > 0,
  );
}

/** The editor route for a screen slug, focusing one field on load. */
export const fieldHref = (screen: string, alan: string) =>
  `${screen ? `/admin/${screen}` : '/admin'}?alan=${encodeURIComponent(alan)}`;

type ScreenInfo = { slug: string; title: string; sections: { id: string; label: string }[] };

export type TaskRow = { label: string; where: string; text: string; href: string };

/** The registry entry an issue belongs to; a `.tr`/`.en` field id belongs to its bilingual entry. */
export const entryOfIssue = (issue: Issue, registry: readonly RegistryEntry[]) =>
  registry.find((e) => e.id === issue.fieldId) ??
  registry.find((e) => e.id === issue.fieldId.replace(/\.(tr|en)$/, ''));

const withoutLabel = (text: string, label: string) =>
  text.startsWith(label) ? text.slice(label.length).replace(/^:\s*/, '').trim() : text;

/** One queue row: field label, screen › section, the problem, and the link that focuses the field. */
export function taskRow(issue: Issue, registry: readonly RegistryEntry[], screens: readonly ScreenInfo[]): TaskRow {
  const entry = entryOfIssue(issue, registry);
  if (!entry && issue.href) {
    const label = issue.label ?? issue.fieldId;
    const text = withoutLabel(issue.text, label);
    return { label, where: issue.where ?? '', text, href: issue.href };
  }
  if (!entry) return { label: issue.fieldId, where: '', text: issue.text, href: '/admin' };
  const label = entryLabel(entry);
  const screen = screens.find((s) => s.slug === entry.screen);
  const section = screen?.sections.find((s) => s.id === entry.editorSection)?.label ?? entry.section;
  const text = withoutLabel(issue.text, label);
  return {
    label,
    where: `${screen?.title ?? entry.screen} › ${section}`,
    text,
    href: fieldHref(entry.screen, issue.fieldId),
  };
}
