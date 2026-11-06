'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { checkCopy, copyFields, identityFields, type CopyKey } from '@/lib/preview-bridge';
import { BilingualField, Disclosure, TextField } from '../../ui/controls';
import { Readout, StatusChip } from '../../ui/feedback';
import { useAdminContent } from '../../ui/store';

export type Pair = { tr: string; en: string };
export type HeroSeed = {
  copy: Record<
    | 'isolation'
    | 'lead'
    | 'note'
    | 'whatIs'
    | 'briefly'
    | 'program'
    | 'university'
    | 'graduation'
    | 'internship'
    | 'direction'
    | 'resultantAlt',
    Pair
  >;
  identity: { firstName: string; lastName: string };
  derived: {
    meta1: Pair;
    meta2: Pair;
    program: Pair;
    university: Pair;
    graduation: Pair;
    internship: Pair;
    theta: number;
  };
};

type HeroKey = keyof HeroSeed['copy'];
const HERO_KEYS: HeroKey[] = [
  'isolation',
  'lead',
  'note',
  'whatIs',
  'briefly',
  'program',
  'university',
  'graduation',
  'internship',
  'direction',
  'resultantAlt',
];

const both = (p: Pair): ReactNode => (
  <span className="block text-right">
    <span className="block">
      <span className="a-sfx">TR&nbsp;</span>
      {p.tr}
    </span>
    <span className="block">
      <span className="a-sfx">EN&nbsp;</span>
      {p.en}
    </span>
  </span>
);

/** Ana sayfa › Hero. Every control here is read by lib/preview-bridge.ts and changes the real Hero in the preview. */
export function HeroEditor({ seed }: { seed: HeroSeed }) {
  const { state, setValue, derived } = useAdminContent();
  const val = (id: string, fallback: string) => state.values[id] ?? fallback;
  // Read-only glance values follow the canonical Profile records as currently edited (one derivation, no copy).
  const h = derived.dict.hero;
  const dv = {
    meta1: h.meta1,
    meta2: h.meta2,
    program: h.programValue,
    university: h.universityValue,
    graduation: h.graduationValue,
    internship: h.internshipValue,
    theta: seed.derived.theta,
  };

  const pair = (k: HeroKey, label: string, helper: string, opts?: { multiline?: boolean; draft?: boolean }) => {
    const f = copyFields[k as CopyKey];
    const tr = val(`${f.id}.tr`, seed.copy[k].tr);
    const en = val(`${f.id}.en`, seed.copy[k].en);
    return (
      <BilingualField
        key={f.id}
        name={f.id}
        label={label}
        helper={helper}
        max={f.max}
        multiline={opts?.multiline}
        draft={opts?.draft}
        tr={tr}
        en={en}
        onTr={(x) => setValue(`${f.id}.tr`, x)}
        onEn={(x) => setValue(`${f.id}.en`, x)}
        errors={{ tr: checkCopy(f, tr), en: checkCopy(f, en) }}
      />
    );
  };

  const missing = { tr: 0, en: 0 };
  for (const k of HERO_KEYS) {
    const f = copyFields[k as CopyKey];
    if (!val(`${f.id}.tr`, seed.copy[k].tr).trim()) missing.tr++;
    if (!val(`${f.id}.en`, seed.copy[k].en).trim()) missing.en++;
  }

  const name = (k: 'firstName' | 'lastName', label: string, helper: string) => {
    const f = identityFields[k];
    const v = val(f.id, seed.identity[k]);
    const empty = !v.trim();
    return (
      <TextField
        key={f.id}
        name={f.id}
        onChange={(x) => setValue(f.id, x)}
        value={v}
        meta={{
          label,
          helper,
          required: true,
          counter: { value: v.length, max: f.max },
          error: empty ? 'Bu alan boş bırakılamaz; önizleme varsayılan adı gösterir.' : undefined,
        }}
      />
    );
  };

  return (
    <>
      <div className="a-hero-status" role="status">
        <StatusChip kind={missing.tr ? 'missing' : 'ready'}>
          {missing.tr ? `TR eksik: ${missing.tr}` : 'TR tamam'}
        </StatusChip>{' '}
        <StatusChip kind={missing.en ? 'missing' : 'ready'}>
          {missing.en ? `EN eksik: ${missing.en}` : 'EN tamam'}
        </StatusChip>
        <p className="a-help">
          Çeviri durumu bu bölümdeki {HERO_KEYS.length} metin çifti içindir. Eksik dil, önizlemede başka dilin metniyle
          doldurulmaz.
        </p>
      </div>

      {name(
        'firstName',
        'Ad',
        'Hero başlığının ilk satırı. Aynı değer üst bilgi, alt bilgi ve sayfa başlıklarında da kullanılır; kaynağı Site ayarları › Kimlik (sonraki aşama).',
      )}
      {name(
        'lastName',
        'Soyad',
        'Hero başlığının ikinci satırı. Soyadı büyük harfle yazın; sitede CSS ile büyütülmez.',
      )}

      {pair(
        'isolation',
        'Kesikli çerçeve etiketi',
        'Adın çevresindeki kesikli çerçevenin üzerindeki küçük italik etiket. Çerçeveye sığması için kısa tutulur.',
      )}
      {pair(
        'lead',
        'Hero cümlesi',
        'Adın altındaki tek cümle. Yazarın onayını bekleyen taslak metin; satır kırılımını önizlemede görün.',
        { draft: true },
      )}
      {pair(
        'note',
        'Kenar notu gövdesi',
        'Etikete tıklayınca açılan serbest cisim açıklaması. En fazla 45 sözcük. Yazarın onayını bekleyen taslak metin.',
        { multiline: true, draft: true },
      )}
      {pair(
        'whatIs',
        'Kenar notu bağlantı etiketi',
        'Hero’daki serbest cisim açıklamasını açan bağlantının metni. Hero’da başka bir çağrı düğmesi yoktur.',
      )}

      <Disclosure label="Etiketler" meta={<span className="a-sfx">7 metin çifti</span>}>
        {pair('briefly', '“Kısaca” başlığı', 'Hero yan sütununun başlığı (geniş ekranda görünür).')}
        {pair(
          'program',
          'Bölüm etiketi',
          'Yalnızca Hero’daki satır etiketi. Kısaca bölümündeki özet satırının etiketi ayrı bir alandır (sonraki aşama).',
        )}
        {pair('university', 'Üniversite etiketi', 'Yalnızca Hero’daki satır etiketi.')}
        {pair(
          'graduation',
          'Mezuniyet etiketi',
          'Yalnızca Hero’daki satır etiketi. Değerin kendisi Eğitim kaydından türetilir.',
        )}
        {pair(
          'internship',
          'Staj etiketi',
          'Yalnızca Hero’daki satır etiketi. Değerin kendisi Deneyim kaydından türetilir.',
        )}
        {pair('direction', '“Yönelim:” etiketi', 'İlgi alanları listesinin önündeki etiket.')}
        {pair(
          'resultantAlt',
          'Bileşke vektörü erişilebilirlik metni',
          'Ekran okuyucular için; görsel olarak görünmez. {deg} belirteci yerine yatayla yapılan açı konur ve silinemez.',
        )}
      </Disclosure>

      <Disclosure label="Türetilmiş değerler (salt okunur)" meta={<span className="a-sfx">kaynak başka yerde</span>}>
        <p className="a-help">
          Bu değerler Hero’da görünür ama burada yazılmaz; tek kaynakları aşağıda belirtilen kayıttır. İlgili
          düzenleyiciler eklenince değişiklik oradan yapılacak.
        </p>
        <dl className="a-readouts">
          <Readout derived label="Meta satırı 1" value={both(dv.meta1)} />
          <Readout derived label="Meta satırı 2" value={both(dv.meta2)} />
          <Readout derived label="Bölüm" value={both(dv.program)} />
          <Readout derived label="Üniversite" value={both(dv.university)} />
          <Readout derived label="Beklenen mezuniyet" value={both(dv.graduation)} />
          <Readout derived label="Staj" value={both(dv.internship)} />
          <Readout derived label="Bileşke açısı θR" value={dv.theta} unit="°" />
        </dl>
        <p className="a-help">
          Kaynaklar: Eğitim ve Deneyim kayıtları (<Link href="/admin/profil">Profil</Link>); θR Kuvvetler kayıtlarından
          hesaplanır.
        </p>
      </Disclosure>

      <div className="a-hero-pending">
        <p className="a-help">
          <strong>Yönelim listesi:</strong> Hero’daki ilgi alanları bu sayfanın{' '}
          <a href="#bolum-yonelim">Yönelim bölümündeki</a> tek listeden gelir; orada düzenlenir.
        </p>
        <p className="a-help">
          <strong>Portre:</strong> Bu Hero yazısal varyanttır (Varyant B); portre göstermez. Portre ayarları Medya
          düzenleyicisine ertelendi.
        </p>
      </div>
    </>
  );
}
