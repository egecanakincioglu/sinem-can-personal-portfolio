import { notFound } from 'next/navigation';
import { assertDevOnly } from '../../../guard';
import { PageHeader, Section } from '../../../ui/PageHeader';
import { EmptyState, ErrorState } from '../../../ui/feedback';
import { screenBySlug, subRecordScreens } from '../../../screens';

export default async function RecordStub({ params }: { params: Promise<{ screen: string; id: string }> }) {
  assertDevOnly();
  const { screen: slug, id } = await params;
  if (!subRecordScreens.includes(slug)) notFound();
  const s = screenBySlug(slug)!;
  const one = slug === 'projeler' ? 'Proje düzenle' : 'Not düzenle';
  return (
    <>
      <PageHeader kicker={s.title} title={one} lede="Kayıt düzenleyicisi sonraki aşamada." />
      <Section id="kayit" title="Kayıt">
        <ErrorState title={`“${decodeURIComponent(id)}” kaydı bulunamadı.`}>
          <p>Henüz hiç kayıt yok; yayın alanı boş pafta olarak kalır.</p>
        </ErrorState>
        <EmptyState title="Düzenleyici sonraki aşamada." mark={`Aşama ${s.stage}`} />
      </Section>
    </>
  );
}
