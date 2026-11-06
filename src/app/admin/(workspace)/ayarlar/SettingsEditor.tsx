'use client';

import { fullDate } from '@/lib/format';
import { identityFields, type CopyKey } from '@/lib/preview-bridge';
import { pagePath } from '@/lib/routes';
import { TextField } from '../../ui/controls';
import { Readout, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { revLetter, useAdmin } from '../../ui/store';
import { screenBySlug, sheetLabel } from '../../screens';
import { ContactEditor, CopyGroup, CopyStatus, GlobalEditor } from '../ana-sayfa/SectionEditors';

const screen = screenBySlug('ayarlar')!;

const SEO_KEYS: CopyKey[] = [
  'metaTitle',
  'metaDescription',
  'profMetaTitle',
  'profMetaDescription',
  'projMetaTitle',
  'projMetaDescription',
  'notesMetaTitle',
  'notesMetaDescription',
];

function IdentityEditor() {
  const { state, setValue, derived } = useAdmin();
  const field = (k: 'firstName' | 'lastName', label: string, helper: string) => {
    const f = identityFields[k];
    const v = state.values[f.id] ?? derived.identity[k];
    return (
      <TextField
        key={f.id}
        name={f.id}
        value={v}
        onChange={(x) => setValue(f.id, x)}
        meta={{
          label,
          helper,
          required: true,
          counter: { value: v.length, max: f.max },
          error: v.trim() ? undefined : 'Bu alan boş bırakılamaz; önizleme varsayılan adı gösterir.',
        }}
      />
    );
  };
  return (
    <>
      {field(
        'firstName',
        'Ad',
        'Ana sayfa › Hero ile aynı alan. Üst bilgi, alt bilgi, sayfa başlıkları ve telif satırı bu değerden türetilir.',
      )}
      {field('lastName', 'Soyad', 'Ana sayfa › Hero ile aynı alan. Soyadı büyük harfle yazın.')}
      <dl className="a-readouts">
        <Readout derived label="Görünen ad" value={derived.ownerName} />
        <Readout derived label="Telif satırı" value={`© ${derived.lastRevision.slice(0, 4)} ${derived.ownerName}`} />
      </dl>
    </>
  );
}

function NavigationDestinations() {
  const rows: [string, string, string][] = [
    ['Profil', pagePath('profile', 'tr'), pagePath('profile', 'en')],
    ['Projeler', pagePath('projects', 'tr'), pagePath('projects', 'en')],
    ['Notlar', pagePath('notes', 'tr'), pagePath('notes', 'en')],
    ['İletişim', '/tr#contact', '/en#contact'],
  ];
  return (
    <>
      <dl className="a-readouts">
        {rows.map(([label, tr, en]) => (
          <Readout
            key={label}
            derived
            label={`Hedef: ${label}`}
            value={
              <span className="a-num">
                TR {tr} · EN {en}
              </span>
            }
          />
        ))}
      </dl>
      <p className="a-help">
        Gezinme hedefleri sitenin sabit rotalarıdır ve burada değiştirilemez; yalnızca etiketleri düzenlenir.
      </p>
    </>
  );
}

function PublicationInfo() {
  const { state, derived } = useAdmin();
  return (
    <>
      <dl className="a-readouts">
        <Readout derived label="Son revizyon tarihi" value={fullDate(derived.lastRevision, 'tr')} />
        <Readout derived label="Mock revizyon" value={`Rev. ${revLetter(state.rev)}`} />
        <Readout derived label="Mock kayıt sayısı" value={state.saveCount} />
        <Readout
          derived
          label="Durum"
          value={state.dirty ? 'Kaydedilmemiş değişiklik var' : 'Kaydedildi (simülasyon)'}
        />
      </dl>
      <p className="a-help">
        <StatusChip kind="draft">Simülasyon</StatusChip> Gerçek yayın, alan adı yapılandırması ya da arama motoru
        güncellemesi yoktur. Değerler yalnızca bu tarayıcı oturumunda tutulur.
      </p>
    </>
  );
}

export function SettingsEditor() {
  return (
    <>
      <PageHeader kicker={sheetLabel('ayarlar')} title={screen.title} lede={screen.lede} />
      <p className="a-help">
        Bu ekrandaki kimlik, iletişim ve etiket alanları Ana sayfa düzenleyicisindekilerle aynı alanlardır: birinde
        yapılan değişiklik diğerinde de görünür. Tüm işlemler simülasyondur.
      </p>

      <Section id="kimlik" title="Kimlik" note="Ad ve soyad, sitenin her yerinde tek kaynaktan kullanılır.">
        <IdentityEditor />
      </Section>
      <Section
        id="iletisim"
        title="İletişim ve platformlar"
        note="E-posta, platform bağlantıları ve İletişim ile alt bilgideki görünürlükleri."
      >
        <ContactEditor />
      </Section>
      <Section id="gezinme" title="Gezinme" note="Üst bilgi etiketleri, okunan bölüm adları ve alt bilgi etiketleri.">
        <NavigationDestinations />
        <GlobalEditor />
      </Section>
      <Section
        id="meta"
        title="Sayfa meta bilgisi"
        note="Tarayıcı başlığı ve açıklama. Önizleme çerçevesi sayfa başlığını göstermez ve arama motorları güncellenmez."
      >
        <CopyStatus keys={SEO_KEYS} />
        <CopyGroup keys={SEO_KEYS} />
        <p className="a-help">
          Varsayılan metinler ad, bölüm ve üniversiteyi içerir; elle düzenlenirse sabit metin olur. Gerçek SEO
          güncellemesi yapılmaz.
        </p>
      </Section>
      <Section id="yayin" title="Yayın bilgisi" note="Salt okunur.">
        <PublicationInfo />
      </Section>
    </>
  );
}
