import { notFound } from 'next/navigation';
import { devFixtureProjects } from '@/content/media-manifest';
import { assertDevOnly } from '../../../guard';
import { PageHeader, Section } from '../../../ui/PageHeader';
import { EmptyState, ErrorState } from '../../../ui/feedback';
import { screenBySlug, subRecordScreens } from '../../../screens';

export default async function RecordStub({ params }: { params: Promise<{ screen: string; id: string }> }) {
  assertDevOnly();
  const { screen: slug, id } = await params;
  if (!subRecordScreens.includes(slug)) notFound();
  const s = screenBySlug(slug)!;
  const key = decodeURIComponent(id);
  // Loaded development samples have a record but no editor yet; any other id has no record at all.
  const sample = devFixtureProjects().some((p) => p.id === key);
  return (
    <>
      <PageHeader kicker={s.title} title="Proje düzenle" lede="Kayıt düzenleyicisi sonraki aşamada." />
      <Section id="kayit" title="Kayıt">
        {sample ? (
          <p className="a-help">“{key}” bir geliştirme örneğidir; kayıt düzenleyicisi sonraki aşamada gelir.</p>
        ) : (
          <ErrorState title={`“${key}” kaydı bulunamadı.`}>
            <p>Henüz hiç kayıt yok; yayın alanı boş pafta olarak kalır.</p>
          </ErrorState>
        )}
        <EmptyState title="Düzenleyici sonraki aşamada." mark={`Aşama ${s.stage}`} />
      </Section>
    </>
  );
}
