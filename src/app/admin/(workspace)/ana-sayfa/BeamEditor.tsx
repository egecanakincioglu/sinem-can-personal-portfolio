'use client';

import { useId, type ReactNode } from 'react';
import { getSiteContent } from '@/content/site-content';
import { cachedNum as num } from '@/lib/format';
import { BEAM_REFERENCE_A, beamMetrics } from '@/lib/physics';
import {
  beamLoadField,
  checkBeamLoad,
  checkCopy,
  copyFields,
  parseBeamLoad,
  type CopyField,
  type CopyKey,
} from '@/lib/preview-bridge';
import { BilingualField, Disclosure, Field } from '../../ui/controls';
import { Readout, StatusChip } from '../../ui/feedback';
import { useAdminContent } from '../../ui/store';
import type { Pair } from './HeroEditor';

const BEAM_KEYS = [
  'beamHeading',
  'beamInterests',
  'beamHint',
  'beamCaption',
  'beamTeaching',
  'beamMoment',
  'beamEquations',
  'beamReadoutsAt',
  'beamReset',
  'beamControls',
  'beamFigAlt',
  'beamValueText',
  'beamResetLabel',
] as const satisfies readonly CopyKey[];
export type BeamKey = (typeof BEAM_KEYS)[number];

export type BeamSeed = {
  copy: Record<BeamKey, Pair>;
  protectedCopy: { figure: Pair; exaggeration: Pair; assumptionsTitle: Pair; assumptions: Pair };
  offset: Pair; // {offset} as printed in each language (reference-only constant)
  scale: { desktop: number; compact: number };
};

const toField = (n: number) => String(n).replace('.', ',');
const tr2 = (n: number) => num(n, 'tr', 2);

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

const PRESETS = [
  { v: 0, label: '0 (sol mesnet)' },
  { v: BEAM_REFERENCE_A, label: '0,35 (varsayılan)' },
  { v: 0.5, label: '0,5 (orta)' },
  { v: 1, label: '1 (sağ mesnet)' },
];

/** Ana sayfa › Yaklaşım. Every control feeds lib/preview-bridge.ts → the real Approach section and BeamFigure. */
export function BeamEditor({ seed }: { seed: BeamSeed }) {
  const { state, setValue } = useAdminContent();
  const val = (id: string, fallback: string) => state.values[id] ?? fallback;
  const sval = (id: string, fallback: string) => state.savedValues[id] ?? fallback;
  const sliderId = useId();

  const keyOf = (k: BeamKey) => copyFields[k] as CopyField;
  const pairFor = (k: BeamKey, label: string, helper: string, opts?: { multiline?: boolean; draft?: boolean }) => {
    const f = keyOf(k);
    const fb = seed.copy[k];
    const tr = val(`${f.id}.tr`, fb.tr);
    const en = val(`${f.id}.en`, fb.en);
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

  // ---- a0: the same strict check the sanitiser uses. The preview shows the default 0,35 L while the entry is invalid.
  const raw = val(beamLoadField.id, toField(BEAM_REFERENCE_A));
  const savedRaw = sval(beamLoadField.id, toField(BEAM_REFERENCE_A));
  const error = checkBeamLoad(raw);
  const parsed = parseBeamLoad(raw);
  const a0 = parsed ?? getSiteContent().beam.defaultLoad;
  const m = beamMetrics(a0);
  const savedA0 = parseBeamLoad(savedRaw) ?? BEAM_REFERENCE_A;
  const noDeflection = m.deltaRatio <= 0.005;

  // ---- translation tally
  const missing = { tr: 0, en: 0 };
  for (const k of BEAM_KEYS) {
    const f = keyOf(k);
    if (!val(`${f.id}.tr`, seed.copy[k].tr).trim()) missing.tr++;
    if (!val(`${f.id}.en`, seed.copy[k].en).trim()) missing.en++;
  }

  // accessible texts exactly as the public figure resolves them for this a0
  const resolveA0 = (k: 'beamResetLabel', l: 'tr' | 'en') =>
    val(`${keyOf(k).id}.${l}`, seed.copy[k][l]).replace('{a0}', num(a0, l));
  const resetAccessible: Pair = { tr: resolveA0('beamResetLabel', 'tr'), en: resolveA0('beamResetLabel', 'en') };
  const valueText = (l: 'tr' | 'en'): string =>
    val(`${keyOf('beamValueText').id}.${l}`, seed.copy.beamValueText[l])
      .replace('{a}', num(a0, l))
      .replace('{ra}', num(m.ra, l))
      .replace('{rb}', num(m.rb, l));

  const boundary =
    a0 === 0
      ? 'Yük sol mesnetin üzerinde: R_A = P, R_B = 0, eğilme momenti ve çökme sıfır.'
      : a0 === 1
        ? 'Yük sağ mesnetin üzerinde: R_A = 0, R_B = P, eğilme momenti ve çökme sıfır.'
        : null;

  const setLoad = (v: number) => setValue(beamLoadField.id, toField(v));
  const changedA0 = raw.trim() !== savedRaw.trim();

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
          Çeviri durumu bu bölümdeki {BEAM_KEYS.length} düzenlenebilir metin çifti içindir. Eksik dil önizlemede “[EN
          eksik]” gibi görünür; başka dilin metniyle doldurulmaz.
        </p>
      </div>

      <div className="a-fixed" role="note">
        <p>
          <strong>Denklemler, tepki, moment ve çökme hesabı korumalıdır.</strong> Burada yalnızca metinler ve varsayılan
          yük konumu a<sub>0</sub> düzenlenir; sayılar lib/physics.ts içindeki mevcut formüllerden hesaplanır, elle
          yazılamaz.
        </p>
      </div>

      <section className="a-res" aria-labelledby="a-beam-a0-h">
        <h3 className="a-sub" id="a-beam-a0-h">
          Varsayılan yük konumu a<sub>0</sub> <span className="a-sfx">· yapılandırma</span>
        </h3>
        <p className="a-help">
          Kiriş açıldığında yükün durduğu konum ve “Sıfırla” düğmesinin döndüğü konum. Birim: açıklık L (0 sol mesnet, 1
          sağ mesnet). Varsayılan 0,35. Ziyaretçi yükü yine serbestçe oynatabilir.
        </p>

        <div className="a-fgroup">
          <Field
            id={`${sliderId}-num`}
            meta={{
              label: 'a₀ (L cinsinden)',
              helper: 'Ondalık için virgül ya da nokta. Aralık: 0 – 1, en fazla 2 ondalık basamak.',
              error,
              required: true,
            }}
          >
            {({ id, describedBy, invalid }) => (
              <input
                id={id}
                name={beamLoadField.id}
                className="a-input a-num-input"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={raw}
                data-testid="a0-input"
                aria-describedby={describedBy}
                aria-invalid={invalid || undefined}
                aria-required
                onChange={(e) => setValue(beamLoadField.id, e.target.value)}
              />
            )}
          </Field>

          <div className="a-range-row">
            <label htmlFor={sliderId} className="a-range-l">
              Kaydırıcı
            </label>
            <input
              id={sliderId}
              type="range"
              className="a-range"
              min={0}
              max={1}
              step={0.01}
              value={a0}
              data-testid="a0-slider"
              aria-valuetext={`a sıfır ${tr2(a0)} L`}
              onChange={(e) => setLoad(Number(e.target.value))}
            />
            <output className="a-num" data-testid="a0-current" htmlFor={sliderId}>
              {tr2(a0)} L
            </output>
          </div>

          <div className="a-preset-row" role="group" aria-label="Hızlı değerler">
            {PRESETS.map((p) => (
              <button
                key={p.v}
                type="button"
                className="a-link"
                data-testid={`a0-preset-${p.v}`}
                onClick={() => setLoad(p.v)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {error && (
            <p className="a-warn" role="status">
              Önizleme geçersiz girişi uygulamaz; varsayılan 0,35 L ile çizilir.
            </p>
          )}
          {changedA0 && !error && (
            <p className="a-help">
              Son kayıttaki a<sub>0</sub>: {tr2(savedA0)} L → şimdi {tr2(a0)} L.
            </p>
          )}
        </div>

        <h4 className="a-fgroup-t">
          Hesaplanan değerler{' '}
          <span className="a-sfx">
            · salt okunur · a<sub>0</sub> = {tr2(a0)} L için
          </span>
        </h4>
        <dl className="a-readouts" data-testid="beam-readouts">
          <Readout derived label="R_A / P (sol tepki)" value={<span data-testid="b-ra">{tr2(m.ra)}</span>} />
          <Readout derived label="R_B / P (sağ tepki)" value={<span data-testid="b-rb">{tr2(m.rb)}</span>} />
          <Readout derived label="M_maks / PL" value={<span data-testid="b-mmax">{tr2(m.mmax)}</span>} />
          <Readout derived label="δ_maks / δ₀" value={<span data-testid="b-delta">{tr2(m.deltaRatio)}</span>} />
          <Readout
            derived
            label="x_m / L (maks. çökme konumu)"
            value={<span data-testid="b-xm">{noDeflection ? '—' : tr2(m.xm)}</span>}
          />
        </dl>
        <p className="a-help">
          R_A + R_B = P. Değerler Yaklaşım diyagramındaki okuma değerleriyle aynı fonksiyondan (beamMetrics) gelir.
        </p>
        {boundary && (
          <p className="a-help" data-testid="b-boundary">
            {boundary}
          </p>
        )}
      </section>

      <div className="a-fgroup">
        <h4 className="a-fgroup-t">
          Başlık ve giriş <span className="a-sfx">· TR / EN</span>
        </h4>
        {pairFor('beamHeading', 'Bölüm başlığı', 'Yaklaşım bölümünün ana başlığı.')}
        {pairFor(
          'beamInterests',
          'Akademik ilgi listesi başlığı',
          'Sol sütundaki listenin üstündeki küçük başlık. Listenin kendisi Eğitim/İlgi kayıtlarından gelir.',
        )}
        {pairFor('beamHint', 'Kısa davet cümlesi', 'Diyagramın üstündeki büyük cümle.')}
      </div>

      <div className="a-fgroup">
        <h4 className="a-fgroup-t">
          Açıklamalar <span className="a-sfx">· TR / EN</span>
        </h4>
        {pairFor(
          'beamCaption',
          'Şekil açıklaması',
          'Diyagramın altındaki açıklama. Denklem ya da sayı yazmayın; değerler diyagramdan okunur.',
          { multiline: true },
        )}
        {pairFor(
          'beamTeaching',
          'Kenar notu (en büyük çökme)',
          'Diyagramın altındaki not. {offset} yazarsanız, açıklık ortasına en uzak mesafe (≈0,077 L) otomatik girilir; elle sayı yazmayın.',
          { multiline: true, draft: true },
        )}
      </div>

      <Disclosure label="Etiketler ve düğmeler" meta={<span className="a-sfx">4 metin çifti</span>}>
        {pairFor('beamMoment', 'Moment diyagramı etiketi', 'Eğilme momenti diyagramının üzerindeki küçük etiket.')}
        {pairFor(
          'beamEquations',
          'Denklemler başlığı',
          'Korumalı denklemlerin üstündeki etiket. Denklemlerin kendisi değişmez.',
        )}
        {pairFor('beamReadoutsAt', 'Okuma değerleri başlığı', '{a} zorunludur ve yük konumuyla otomatik dolar.')}
        {pairFor('beamReset', 'Sıfırla düğmesi', 'Yükü varsayılan konuma döndüren düğmenin görünen metni.')}
      </Disclosure>

      <Disclosure label="Erişilebilirlik metinleri" meta={<span className="a-sfx">4 metin çifti</span>}>
        {pairFor('beamControls', 'Yük konumu adı', 'Kaydırıcının ve kontrol grubunun ekran okuyucu adı.')}
        {pairFor('beamFigAlt', 'Diyagram alternatif metni', 'Ekran okuyucuların diyagram için okuduğu metin.', {
          multiline: true,
        })}
        {pairFor(
          'beamValueText',
          'Kaydırıcı değer metni',
          'Ekran okuyucu her konumda bunu okur. {a} zorunlu; {ra} ve {rb} isteğe bağlı, hesaplanan tepkilerle dolar.',
        )}
        {pairFor(
          'beamResetLabel',
          'Sıfırla düğmesi erişilebilir adı',
          '{a0} yazarsanız düzenlenen varsayılan konum (örn. 0,50 L) otomatik girilir. Sabit bir sayı yazmayın.',
        )}
        <dl className="a-readouts">
          <Readout derived label="Sıfırla adı (bu a₀ ile)" value={both(resetAccessible)} />
          <Readout
            derived
            label="Kaydırıcı değer metni (bu a₀ ile)"
            value={both({ tr: valueText('tr'), en: valueText('en') })}
          />
        </dl>
      </Disclosure>

      <Disclosure label="Referans ve korumalı içerik" meta={<span className="a-sfx">salt okunur</span>}>
        <p className="a-help">
          Bu değerler a<sub>0</sub> ile değişmez: geometrik sabitler ve çizim ölçeğidir.
        </p>
        <dl className="a-readouts">
          <Readout
            derived
            label="{offset}: açıklık ortasından en uzak mesafe"
            value={both({ tr: `${seed.offset.tr}\u00a0L`, en: `${seed.offset.en}\u00a0L` })}
          />
          <Readout
            derived
            label="Çökme çizim ölçeği (δ₀, açıklığın %’si)"
            value={
              <span>
                masaüstü {num(seed.scale.desktop, 'tr', 1)} · mobil {num(seed.scale.compact, 'tr', 0)}
              </span>
            }
          />
          <Readout locked label="Şekil numarası" value={both(seed.protectedCopy.figure)} />
          <Readout label="Abartı notu" value={both(seed.protectedCopy.exaggeration)} />
          <Readout label="Varsayımlar başlığı" value={both(seed.protectedCopy.assumptionsTitle)} />
          <Readout label="Varsayımlar" value={both(seed.protectedCopy.assumptions)} />
          <Readout label="Denklemler (1)–(3)" value="R_A = P·b/L · R_B = P·a/L · M_maks = P·a·b/L" />
        </dl>
        <p className="a-help">
          Abartı notu çizim ölçeğine, varsayımlar mühendislik kabullerine bağlıdır; yalnızca kodda değişir. Diyagramın
          SVG geometrisi, çizgi stilleri ve sürükleme davranışı da korumalıdır.
        </p>
      </Disclosure>
    </>
  );
}
