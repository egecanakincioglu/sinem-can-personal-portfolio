import Link from 'next/link';
import { assertDevOnly } from '../guard';
import { PageHeader, Section } from '../ui/PageHeader';
import { EmptyState, Readout, StatusChip } from '../ui/feedback';
import { screens, screenHref } from '../screens';
import { draft, forceRecords, interests } from '@/content/site';

export default function Overview() {
  assertDevOnly();
  const unapproved = Object.values(draft).filter(
    (v) => v && typeof v === 'object' && 'approved' in v && v.approved === false,
  ).length;
  return (
    <>
      <PageHeader
        kicker="Pafta 00"
        title="Genel bakış"
        lede="Çalışma masasının özeti. Rakamlar kutu değil, kayıt satırlarıdır; asıl düzenleme sol dizindeki ekranlarda yapılır."
      />
      <Section id="durum" title="Durum" note="Bu değerler kayıtlardan okunur; elle yazılmaz.">
        <dl className="a-readouts">
          <Readout label="Kuvvet kayıtları" value={forceRecords.length} derived />
          <Readout label="Yönelim öğeleri" value={interests.length} derived />
          <Readout label="Onay bekleyen metin grupları" value={unapproved} derived />
          <Readout label="Projeler · Notlar" value="0 · 0" />
        </dl>
      </Section>
      <Section id="revizyon" title="Son revizyonlar">
        <EmptyState title="Henüz simüle edilmiş yayın yok." mark="Rev. A">
          <p>Her “Yayınla (sim.)” işlemi burada bir satır olarak görünecek. Gerçek siteye hiçbir şey gönderilmez.</p>
        </EmptyState>
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
