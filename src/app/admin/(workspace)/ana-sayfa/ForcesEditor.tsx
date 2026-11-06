'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { getSiteContent, mergeSiteContent } from '@/content/site-content';
import { num } from '@/lib/format';
import { resultant } from '@/lib/physics';
import {
  FORCE_IDS,
  buildOverride,
  checkCopy,
  checkForceNumber,
  copyFields,
  forceCopyField,
  forceEditable,
  forceFieldId,
  forceLimits,
  type CopyField,
  type CopyKey,
  type ForceNum,
  type ForceTextPart,
} from '@/lib/preview-bridge';
import { BilingualField, Disclosure, Field } from '../../ui/controls';
import { Readout, StatusChip } from '../../ui/feedback';
import { useAdmin } from '../../ui/store';
import type { Pair } from './HeroEditor';

export type ForcesSeed = {
  records: {
    id: string;
    magnitude: number;
    angleDeg: number;
    short: Pair;
    period: Pair;
    title: Pair;
    text: Pair;
    source: string;
  }[];
  copy: Record<
    'forcesHeading' | 'forcesText' | 'forcesList' | 'forcesResult' | 'forcesPartial' | 'forcesReverse',
    Pair
  >;
  locked: { caption: Pair };
};

type SectionKey = keyof ForcesSeed['copy'];
const SECTION_KEYS: SectionKey[] = [
  'forcesHeading',
  'forcesText',
  'forcesList',
  'forcesResult',
  'forcesPartial',
  'forcesReverse',
];
const PARTS: ForceTextPart[] = ['period', 'title', 'text'];
const PART_LABEL: Record<ForceTextPart, string> = { period: 'Dönem', title: 'Başlık', text: 'Açıklama' };

const tr1 = (n: number, d = 1) => num(n, 'tr', d);
const toField = (n: number) => String(n).replace('.', ',');

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

function NumField({
  name,
  kind,
  value,
  onChange,
  label,
  helper,
  unit,
}: {
  name: string;
  kind: ForceNum;
  value: string;
  onChange: (v: string) => void;
  label: string;
  helper: string;
  unit: string;
}) {
  const id = useId();
  const error = checkForceNumber(kind, value);
  const l = forceLimits[kind];
  return (
    <Field
      id={id}
      meta={{
        label: `${label} (${unit})`,
        helper: `${helper} Aralık: ${toField(l.min)} – ${toField(l.max)}.`,
        error,
        required: true,
      }}
    >
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          name={name}
          className="a-input a-num-input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          aria-required
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

/** Ana sayfa › Kuvvetler. Six fixed records F1–F6. Every control feeds lib/preview-bridge.ts → the real Forces section and Hero. */
export function ForcesEditor({ seed }: { seed: ForcesSeed }) {
  const { state, setValue } = useAdmin();
  const [activeId, setActiveId] = useState<string>(FORCE_IDS[0]);
  const val = (id: string, fallback: string) => state.values[id] ?? fallback;
  const sval = (id: string, fallback: string) => state.savedValues[id] ?? fallback;

  const pairFor = (
    f: CopyField,
    label: string,
    helper: string | undefined,
    fallback: Pair,
    opts?: { multiline?: boolean; draft?: boolean },
  ) => {
    const tr = val(`${f.id}.tr`, fallback.tr);
    const en = val(`${f.id}.en`, fallback.en);
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

  // The same pipeline the preview uses: editor values -> validated override -> mergeSiteContent -> lib/physics.
  const current = useMemo(() => mergeSiteContent(buildOverride(state.values)).forceRecords, [state.values]);
  const saved = useMemo(() => mergeSiteContent(buildOverride(state.savedValues)).forceRecords, [state.savedValues]);
  const R = resultant(current);
  const Rsaved = resultant(saved);
  const Rdefault = resultant(getSiteContent().forceRecords);
  const dTheta = Math.abs(R.angleDeg - Rsaved.angleDeg);

  // Translation and error tally across every pair in this section.
  const missing = { tr: 0, en: 0 };
  const countPair = (f: CopyField, fb: Pair) => {
    if (!val(`${f.id}.tr`, fb.tr).trim()) missing.tr++;
    if (!val(`${f.id}.en`, fb.en).trim()) missing.en++;
  };
  let pairs = 0;
  for (const k of SECTION_KEYS) {
    countPair(copyFields[k as CopyKey], seed.copy[k]);
    pairs++;
  }
  for (const r of seed.records)
    for (const p of PARTS)
      if (forceEditable[r.id as keyof typeof forceEditable][p]) {
        countPair(forceCopyField(r.id, p), r[p]);
        pairs++;
      }

  const recStatus = (r: ForcesSeed['records'][number]) => {
    let errors = 0,
      miss = 0,
      changed = false;
    for (const kind of ['magnitude', 'angle'] as const) {
      const id = forceFieldId(r.id, kind);
      if (checkForceNumber(kind, val(id, toField(kind === 'magnitude' ? r.magnitude : r.angleDeg)))) errors++;
      if (val(id, '') !== sval(id, '')) changed = true;
    }
    for (const p of PARTS) {
      if (!forceEditable[r.id as keyof typeof forceEditable][p]) continue;
      const f = forceCopyField(r.id, p);
      for (const l of ['tr', 'en'] as const) {
        const v = val(`${f.id}.${l}`, r[p][l]);
        if (!v.trim()) miss++;
        if (checkCopy(f, v)) errors++;
        if (val(`${f.id}.${l}`, '') !== sval(`${f.id}.${l}`, '')) changed = true;
      }
    }
    return { errors, miss, changed };
  };

  const rec = seed.records.find((r) => r.id === activeId) ?? seed.records[0];
  const idx = seed.records.indexOf(rec);
  const edit = forceEditable[rec.id as keyof typeof forceEditable];
  const derivedParts = PARTS.filter((p) => !edit[p]);
  const magId = forceFieldId(rec.id, 'magnitude');
  const angId = forceFieldId(rec.id, 'angle');
  const outside = R.angleDeg < 0 || R.angleDeg > 90;

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
          Çeviri durumu bu bölümdeki {pairs} düzenlenebilir metin çifti içindir. Eksik dil önizlemede “[EN eksik]” gibi
          görünür; başka dilin metniyle doldurulmaz. Eğitim, Deneyim ve Topluluk kayıtlarından gelen metinler burada
          sayılmaz.
        </p>
      </div>

      <div className="a-fixed" role="note">
        <p>
          <strong>6 / 6 (sabit).</strong> Altı vektör ve bileşke R toplam 7 ok eder; bu, marka kurallarındaki diyagram
          sınırıdır. Kayıt eklenemez, silinemez, sırası değiştirilemez.
        </p>
        <p>
          <strong>Vektör değerleri kavramsaldır, ölçülmüş fiziksel veri değildir.</strong> Büyüklük ve yön yalnızca
          diyagramın çizimini belirler.
        </p>
      </div>

      <section className="a-res" aria-labelledby="a-res-h">
        <h3 className="a-sub" id="a-res-h">
          Hesaplanan bileşke <span className="a-sfx">· salt okunur</span>
        </h3>
        <dl className="a-readouts" data-testid="forces-resultant">
          <Readout
            derived
            label="Bileşke büyüklüğü |R|"
            value={<span data-testid="r-mag">{tr1(R.magnitude, 2)}</span>}
          />
          <Readout
            derived
            label="Bileşke açısı θR"
            value={<span data-testid="r-ang">{tr1(R.angleDeg, 1)}</span>}
            unit="°"
          />
          <Readout
            derived
            label="Son kayda göre"
            value={
              <span>
                θR {tr1(Rsaved.angleDeg)}° → {tr1(R.angleDeg)}°
              </span>
            }
          />
          <Readout
            derived
            label="Varsayılana göre"
            value={
              <span>
                θR {tr1(Rdefault.angleDeg)}° → {tr1(R.angleDeg)}°
              </span>
            }
          />
          <Readout derived label="Vektör zinciri" value="6 vektör + R = 7 ok" />
        </dl>
        <p className="a-help">
          Bu değerler lib/physics.ts içindeki vektör toplamından hesaplanır; elle yazılamaz. Hero’daki θR ve Kuvvetler
          diyagramındaki son bileşke aynı hesaptan gelir.
        </p>
        {outside && (
          <p className="a-warn">
            Uyarı: θR 0°–90° dışına çıktı. Marka metni yukarı doğru bir yönelim anlatıyor; diyagram her açıyı çizebilir.
          </p>
        )}
        {dTheta >= 5 && (
          <p className="a-warn">
            Uyarı: θR son kayıttan {tr1(dTheta)}° saptı. Yönelim metni, Hero alternatif metni ve figür alternatif metni
            hâlâ doğru mu?
          </p>
        )}
      </section>

      <nav className="a-fnav" aria-label="Etki kayıtları">
        {seed.records.map((r) => {
          const s = recStatus(r);
          const on = r.id === rec.id;
          return (
            <button
              key={r.id}
              type="button"
              className={`a-fnav-btn${on ? ' is-active' : ''}`}
              aria-current={on ? 'true' : undefined}
              onClick={() => setActiveId(r.id)}
            >
              <span className="a-fnav-id">
                F<sub>{FORCE_IDS.indexOf(r.id as (typeof FORCE_IDS)[number]) + 1}</sub>
              </span>
              <span className="a-fnav-t">{val(forceCopyField(r.id, 'title').id + '.tr', r.title.tr)}</span>
              <span className="a-fnav-flags">
                {s.errors > 0 && <span className="a-sfx">hata {s.errors}</span>}
                {s.miss > 0 && <span className="a-sfx a-ghost">eksik {s.miss}</span>}
                {s.changed && <span className="a-sfx">değişti</span>}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="a-frec" key={rec.id} data-testid={`force-record-${rec.id}`}>
        <h3 className="a-sub">
          Kayıt {rec.id} <span className="a-sfx">· {idx + 1} / 6 · kimlik ve sıra kilitli</span>
        </h3>

        <div className="a-fgroup">
          <h4 className="a-fgroup-t">
            Vektör girdileri <span className="a-sfx">· kavramsal</span>
          </h4>
          <NumField
            name={magId}
            kind="magnitude"
            label="Büyüklük"
            unit="birimsiz"
            helper="Diyagramdaki oku orantılı çizer; kuvvet ölçümü değildir."
            value={val(magId, toField(rec.magnitude))}
            onChange={(x) => setValue(magId, x)}
          />
          <NumField
            name={angId}
            kind="angle"
            label="Yön"
            unit="derece"
            helper="Yatay eksenden saat yönünün tersine ölçülür; pozitif değer yukarı bakar."
            value={val(angId, toField(rec.angleDeg))}
            onChange={(x) => setValue(angId, x)}
          />
          <button
            type="button"
            className="a-link"
            onClick={() => {
              setValue(magId, toField(rec.magnitude));
              setValue(angId, toField(rec.angleDeg));
            }}
          >
            Bu kaydın varsayılan değerlerine dön ({toField(rec.magnitude)} · {toField(rec.angleDeg)}°)
          </button>
        </div>

        {PARTS.filter((p) => edit[p]).length > 0 && (
          <div className="a-fgroup">
            <h4 className="a-fgroup-t">
              Metinler <span className="a-sfx">· TR / EN</span>
            </h4>
            {PARTS.filter((p) => edit[p]).map((p) =>
              pairFor(
                forceCopyField(rec.id, p),
                PART_LABEL[p],
                p === 'text'
                  ? 'Listede başlığın altında görünen açıklama.'
                  : p === 'title'
                    ? 'Listedeki kalın başlık.'
                    : 'Listede başlığın üstündeki küçük dönem satırı.',
                rec[p],
                { multiline: p === 'text', draft: p === 'text' },
              ),
            )}
          </div>
        )}

        <div className="a-fgroup">
          <h4 className="a-fgroup-t">
            Kaynak kayıttan gelenler <span className="a-sfx">· salt okunur</span>
          </h4>
          <dl className="a-readouts">
            {derivedParts.map((p) => (
              <Readout key={p} derived label={PART_LABEL[p]} value={both(rec[p])} />
            ))}
            <Readout derived label="Kısa ad (iç etiket)" value={both(rec.short)} />
          </dl>
          <p className="a-help">
            {derivedParts.length === 3
              ? 'Dönem, başlık ve açıklama'
              : derivedParts.length
                ? 'Dönem ve başlık'
                : 'Bu alanlar'}{' '}
            {rec.source} kaydından üretilir; çift kaynak olmaması için burada yazılmaz. İlgili düzenleyici eklenince
            oradan değişecek. Kısa ad şu an Ana sayfa’da görünmüyor (diyagram F<sub>n</sub> numarasını çizer); bu yüzden
            düzenlenemez.
          </p>
        </div>
      </div>

      <Disclosure label="Bölüm metinleri" meta={<span className="a-sfx">6 metin çifti</span>}>
        {pairFor(
          copyFields.forcesHeading,
          'Bölüm başlığı',
          'Kuvvetler bölümünün başlığı. Bileşkenin sıfır olduğunu ima eden bir ifade yazmayın.',
          seed.copy.forcesHeading,
        )}
        {pairFor(
          copyFields.forcesText,
          'Giriş paragrafı',
          'Başlığın altındaki açıklama. Sıfırdan farklı bileşkenin hareket değil ivmelenme anlattığı fikri korunmalı. Yazarın onayını bekleyen taslak metin.',
          seed.copy.forcesText,
          { multiline: true, draft: true },
        )}
        {pairFor(copyFields.forcesList, 'Liste başlığı', 'Altı kaydın üstündeki küçük başlık.', seed.copy.forcesList)}
        {pairFor(
          copyFields.forcesResult,
          'Bileşke etiketi',
          'Son adımda “Bileşke R” yerine görünen etiket.',
          seed.copy.forcesResult,
        )}
        {pairFor(
          copyFields.forcesPartial,
          'Kısmi bileşke etiketi',
          'Kaydırırken ara adımlarda görünen etiket.',
          seed.copy.forcesPartial,
        )}
        {pairFor(
          copyFields.forcesReverse,
          'Sırayı ters çevir düğmesi',
          'Toplama sırasını tersine çeviren düğmenin metni.',
          seed.copy.forcesReverse,
        )}
      </Disclosure>

      <Disclosure label="Korumalı metinler" meta={<span className="a-sfx">kodda korunur</span>}>
        <p className="a-help">
          Bu metin vektörlerin kavramsal olduğunu söyleyen dürüstlük metnidir; yalnızca kodda değişir.
        </p>
        <dl className="a-readouts">
          <Readout label="Şekil açıklaması" value={both(seed.locked.caption)} />
        </dl>
      </Disclosure>
    </>
  );
}
