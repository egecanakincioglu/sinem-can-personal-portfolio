'use client';

import Link from 'next/link';
import { groupIssues, taskRow } from '@/lib/task-queue';
import { registry } from '../registry';
import { screens } from '../screens';
import { Dialog, EmptyState } from './feedback';
import { useAdmin } from './store';

/** Task queue: the working state's issues in the fixed groups. Every row opens its field. */
export function TaskQueue({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { issues, state } = useAdmin();
  const groups = groupIssues(issues);
  return (
    <Dialog open={open} onClose={onClose} label="Görev kuyruğu" variant="sheet">
      <div className="a-dialog-bar">
        <h2 className="a-dialog-title">Görev kuyruğu</h2>
        <button type="button" className="a-link" onClick={onClose}>
          Kapat
        </button>
      </div>
      {groups.length === 0 ? (
        <EmptyState title="Bekleyen görev yok." mark="0 görev">
          <p>Görevler, çalışma değerlerinden ve kayıt alanlarından türetilir; bu liste elle yazılmaz.</p>
        </EmptyState>
      ) : (
        <>
          <p className="a-help" role="status">
            {issues.length} görev
          </p>
          {groups.map(({ group, issues: rows }) => (
            <section key={group} aria-label={group} className="a-task-group">
              <h3 className="a-panel-k">
                {group} · <span className="a-num">{rows.length}</span>
              </h3>
              <ul className="a-task-list">
                {rows.map((issue, i) => {
                  const r = taskRow(issue, registry, screens);
                  return (
                    <li key={`${issue.fieldId}-${i}`} className="a-task">
                      <Link href={r.href} className="a-task-link" onClick={onClose}>
                        <span className="a-task-label">{r.label}</span>
                        {r.where && <span className="a-help"> · {r.where}</span>}
                        <span className="a-help"> · {r.text}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </>
      )}
      {/* The toasts disappear after a few seconds; this is the list that stays, for anyone who missed one. */}
      <section aria-label="Son eylemler" className="a-task-group">
        <h3 className="a-panel-k">Son eylemler</h3>
        {state.log.length === 0 ? (
          <p className="a-help">Henüz eylem yok.</p>
        ) : (
          <ul className="a-task-list">
            {state.log.map((text, i) => (
              <li key={`${i}-${text}`} className="a-task a-log">
                {text}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Dialog>
  );
}
