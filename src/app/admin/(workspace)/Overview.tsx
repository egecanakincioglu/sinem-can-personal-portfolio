'use client';

import Link from 'next/link';
import { fullDate, num } from '@/lib/format';
import { resultant } from '@/lib/physics';
import { revLetter } from '@/lib/publish';
import { groupIssues } from '@/lib/task-queue';
import { PageHeader, Section } from '../ui/PageHeader';
import { EmptyState, Readout, StatusChip } from '../ui/feedback';
import { useAdmin } from '../ui/store';
import { screenBySlug, screenHref, screens, sheetLabel } from '../screens';

const screen = screenBySlug('')!;

/** Blank alternative-text sides in a value: any `alt` that is a TR/EN pair counts each empty language. */
function emptyAlt(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  if (Array.isArray(value)) return value.reduce<number>((n, v) => n + emptyAlt(v), 0);
  return Object.entries(value).reduce<number>((n, [k, v]) => {
    const pair = v as { tr?: unknown; en?: unknown } | null;
    if (k === 'alt' && pair && typeof pair.tr === 'string' && typeof pair.en === 'string')
      return n + (pair.tr.trim() ? 0 : 1) + (pair.en.trim() ? 0 : 1);
    return n + emptyAlt(v);
  }, 0);
}

/** Overview: hairline records read from the mock state. Every figure is derived, none is typed. */
export function Overview() {
  const { state, derived, snapshot, issues } = useAdmin();
  const groups = groupIssues(issues);
  const unapproved = groups.find((g) => g.group === 'Onay bekleyen metinler')?.issues.length ?? 0;
  const altGaps = emptyAlt(derived.portrait) + emptyAlt(state.projects);
  const theta = num(resultant(derived.forceRecords).angleDeg, 'tr', 1);
  const last = state.revisions.slice(0, 3);
  return (
    <>
      <PageHeader kicker={sheetLabel('')} title={screen.title} lede={screen.lede} />
      <Section id="gorevler" title="Görevler" note="Üst çubuktaki görev sayısıyla aynı listeden türetilir.">
        {groups.length === 0 ? (
          <p className="a-help">Bekleyen görev yok.</p>
        ) : (
          <dl className="a-readouts">
            {groups.map((g) => (
              <Readout key={g.group} derived label={g.group} value={g.issues.length} />
            ))}
          </dl>
        )}
      </Section>
      <Section id="saglik" title="Site sağlığı" note="Çalışma değerlerinden hesaplanır; elle yazılmaz.">
        <dl className="a-readouts">
          <Readout derived label="Boş alternatif metin" value={altGaps} />
          <Readout derived label="Onay bekleyen metinler" value={unapproved} />
        </dl>
      </Section>
      <Section id="durum" title="Durum" note="Bu değerler kayıtlardan okunur; elle yazılmaz.">
        <dl className="a-readouts">
          <Readout derived label="Bileşke açısı θR" value={theta} unit="°" />
          <Readout derived label="Kuvvet kayıtları" value={derived.forceRecords.length} />
          <Readout derived label="Yönelim öğeleri" value={derived.interests.length} />
          <Readout derived label="Projeler" value={state.projects.length} />
          <Readout derived label="Notlar" value={state.notes.length} />
          <Readout derived label="Yayında görünen projeler" value={snapshot.publicProjects.length} />
        </dl>
      </Section>
      <Section id="revizyon" title="Son revizyonlar">
        {last.length === 0 ? (
          <EmptyState title="Henüz simüle edilmiş yayın yok." mark={`Rev. ${revLetter(state.rev)}`}>
            <p>Her “Yayınla (sim.)” işlemi burada bir satır olarak görünecek. Gerçek siteye hiçbir şey gönderilmez.</p>
          </EmptyState>
        ) : (
          <dl className="a-readouts">
            {last.map((r) => (
              <Readout
                key={r.rev}
                label={`Rev. ${revLetter(r.rev)} — ${fullDate(r.at.slice(0, 10), 'tr')} (sim.)`}
                value={r.changes.length}
                unit="değişiklik"
              />
            ))}
          </dl>
        )}
        <p className="a-help">
          <Link href="/admin/yayin">Yayın ekranı</Link>
        </p>
      </Section>
      <Section id="ekranlar" title="Ekranlar">
        <ul className="a-recs">
          {screens
            .filter((s) => s.slug)
            .map((s, i) => (
              <li className="a-rec" key={s.slug}>
                <div className="a-rec-meta">
                  <span className="a-num">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="a-rec-body">
                  <Link href={screenHref(s)} className="a-rec-link">
                    {s.title}
                  </Link>
                  <p className="a-help">{s.lede}</p>
                </div>
                <div className="a-rec-tools">
                  {s.slug === 'ana-sayfa' ? (
                    <StatusChip kind="ready">Açık</StatusChip>
                  ) : (
                    <span className="a-help">Aşama {s.stage}</span>
                  )}
                </div>
              </li>
            ))}
        </ul>
      </Section>
      <Section id="hakkinda" title="Prototip hakkında">
        <p className="a-prose">
          ANTET, genel sitenin çizim bürosudur: aynı pafta, çizenin tarafından görünür. Bu bir prototiptir; kimlik
          doğrulama, veritabanı ya da yükleme yoktur ve geliştirme ortamı dışında hiçbir şey sunulmaz.
        </p>
      </Section>
    </>
  );
}
