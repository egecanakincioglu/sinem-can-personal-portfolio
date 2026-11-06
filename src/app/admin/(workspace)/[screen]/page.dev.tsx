import { notFound, redirect } from 'next/navigation';
import { assertDevOnly } from '../../guard';
import { PageHeader, Section } from '../../ui/PageHeader';
import { EmptyState, StatusChip } from '../../ui/feedback';
import { screenBySlug } from '../../screens';

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
        kicker="Pafta"
        title={s.title}
        lede={s.lede}
        aside={<StatusChip kind="draft">Kullanıma açık değil</StatusChip>}
      />
      <Section id="durum" title="Durum">
        <EmptyState title={`${s.title} ekranı kullanıma açık değil.`}>
          <p>Bu ekranın alanları kayıt defterinden gelir.</p>
        </EmptyState>
      </Section>
    </>
  );
}
