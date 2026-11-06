import Link from 'next/link';
import type { CoverageRow, CoverageSummary, FieldLocale, FieldType, RegistryEntry } from '@/lib/field-registry';
import { Section } from '../../ui/PageHeader';
import { Readout, StatusChip } from '../../ui/feedback';
import { screenBySlug, screenHref } from '../../screens';

const localeText: Record<FieldLocale, string> = { bilingual: 'TR + EN', shared: 'Ortak' };
const typeText: Record<FieldType, string> = {
  text: 'Metin',
  number: 'Sayı',
  toggle: 'Anahtar',
  choice: 'Seçim',
  list: 'Liste',
  record: 'Kayıt',
  media: 'Medya',
};
const pageOrder = ['Ana sayfa', 'Profil', 'Projeler', 'Notlar', 'Tüm sayfalar'];

function editorOf(e: RegistryEntry) {
  const screen = screenBySlug(e.screen);
  const section = screen?.sections.find((s) => s.id === e.editorSection)?.label;
  return { screen, text: [screen?.title ?? e.screen, section].filter(Boolean).join(' › ') };
}

function Row({ row }: { row: CoverageRow }) {
  const { entry, fields } = row;
  const { screen, text } = editorOf(entry);
  return (
    <tr>
      <td>{entry.section}</td>
      <td>
        {entry.label && <span className="a-matrix-label">{entry.label}</span>}
        <code className="a-matrix-path">{entry.path}</code>
        {fields > 1 && <span className="a-sfx"> · {fields} alan</span>}
      </td>
      <td>
        {entry.status === 'ready' && screen ? <Link href={screenHref(screen)}>{text}</Link> : <span>{text}</span>}
        {entry.derived && <span className="a-sfx"> · türetilmiş</span>}
      </td>
      <td>{localeText[entry.locale]}</td>
      <td>{typeText[entry.type]}</td>
      <td>
        {entry.status === 'ready' ? (
          <StatusChip kind="ready">Hazır</StatusChip>
        ) : (
          <StatusChip kind="draft">Planlandı</StatusChip>
        )}
      </td>
    </tr>
  );
}

/** The registry as a matrix: public location x admin editor x status, one table per public page. */
export function KapsamMatrix({ summary, uncovered }: { summary: CoverageSummary; uncovered: readonly string[] }) {
  const pages = new Map<string, CoverageRow[]>();
  for (const row of summary.rows) pages.set(row.entry.page, [...(pages.get(row.entry.page) ?? []), row]);
  const ordered = [...pages.keys()].sort((a, b) => {
    const [i, j] = [pageOrder.indexOf(a), pageOrder.indexOf(b)];
    return (i < 0 ? pageOrder.length : i) - (j < 0 ? pageOrder.length : j);
  });
  const plannedBy = new Map<string, number>();
  for (const r of summary.rows) {
    if (r.entry.status === 'planned') plannedBy.set(r.entry.screen, (plannedBy.get(r.entry.screen) ?? 0) + r.fields);
  }

  return (
    <>
      <Section id="ozet" title="Özet" note="Sayılar kayıt defterinden hesaplanır; elle yazılmaz.">
        <dl className="a-readouts">
          <Readout label="Genel sitedeki alan" value={summary.total} derived />
          <Readout label="Düzenleyicisi olan alan" value={summary.ready} derived />
          <Readout label="Düzenleyicisi henüz olmayan alan" value={summary.planned} derived />
          <Readout label="Kayıt defterinde karşılığı olmayan alan" value={uncovered.length} derived />
        </dl>
      </Section>
      <Section
        id="planlanan"
        title="Planlanan düzenleyiciler"
        note="Düzenleyicisi henüz çizilmemiş alanlar, hedef ekrana göre."
      >
        <dl className="a-readouts">
          {[...plannedBy].map(([slug, n]) => (
            <Readout key={slug} label={screenBySlug(slug)?.title ?? slug} value={n} derived />
          ))}
        </dl>
      </Section>
      {ordered.map((page) => (
        <Section key={page} id={`sayfa-${pageOrder.includes(page) ? pageOrder.indexOf(page) : page}`} title={page}>
          <div
            className="a-matrix-wrap"
            role="region"
            aria-label={`Kapsam tablosu (yatay kaydırılır) · ${page}`}
            tabIndex={0}
          >
            <table className="a-matrix">
              <caption className="a-vh">{`${page}: genel sitedeki yer, alan, düzenleyici ve durum`}</caption>
              <thead>
                <tr>
                  <th scope="col">Bölüm</th>
                  <th scope="col">Alan</th>
                  <th scope="col">Düzenleyici</th>
                  <th scope="col">Dil</th>
                  <th scope="col">Tür</th>
                  <th scope="col">Durum</th>
                </tr>
              </thead>
              <tbody>
                {(pages.get(page) ?? []).map((row) => (
                  <Row key={row.entry.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}
    </>
  );
}
