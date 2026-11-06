import { notFound, redirect } from 'next/navigation';
import { assertDevOnly } from '../../guard';
import { PageHeader, Section } from '../../ui/PageHeader';
import { EmptyState, StatusChip } from '../../ui/feedback';
import { screenBySlug, sheetLabel } from '../../screens';

// Stub for every screen that is not built yet. Real screens (ana-sayfa) have their own folder.
export default async function Stub({ params }: { params: Promise<{ screen: string }> }) {
  assertDevOnly();
  const { screen: slug } = await params;
  if (slug === 'anasayfa') redirect('/admin/ana-sayfa');
  const s = screenBySlug(slug);
  if (!s || !s.slug) notFound();
  return (
    <>
      <PageHeader
        kicker={sheetLabel(s.slug)}
        title={s.title}
        lede={s.lede}
        aside={<StatusChip kind="draft">Yer tutucu</StatusChip>}
      />
      <Section id="durum" title="Bu ekran sonraki aşamada">
        <EmptyState title={`${s.title} ekranı henüz çizilmedi.`} mark={`Aşama ${s.stage}`}>
          <p>Şimdilik yalnızca yer, başlık ve gezinme hazır. Alanlar, kayıt defterinden üretilecek.</p>
        </EmptyState>
      </Section>
    </>
  );
}
