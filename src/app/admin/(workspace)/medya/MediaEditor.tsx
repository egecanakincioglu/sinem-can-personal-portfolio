'use client';

import Image from 'next/image';
import { Portrait } from '@/components/Portrait';
import { getSiteContent } from '@/content/site-content';
import { checkPortraitAsset, type MediaAsset } from '@/lib/media';
import { checkPortraitNumber, portraitFields, portraitSlotFields } from '@/lib/preview-bridge';
import { BilingualField, Segmented, TextField } from '../../ui/controls';
import { StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { screenBySlug } from '../../screens';

const screen = screenBySlug('medya')!;
const dec = (n: number) => String(n).replace('.', ',');
const onOff = [
  { value: '1', label: 'Göster' },
  { value: '0', label: 'Gizle' },
];

export function Thumb({ a }: { a: MediaAsset }) {
  return (
    <Image
      src={a.src}
      alt={a.alt.tr}
      width={a.width}
      height={a.height}
      sizes="160px"
      unoptimized
      className="a-media-thumb"
    />
  );
}

function PortraitSlot({ assets }: { assets: readonly MediaAsset[] }) {
  const { state, setValue, derived } = useAdmin();
  const base = getSiteContent().portrait;
  const v = state.values;
  const eligible = assets.filter((a) => checkPortraitAsset(a).ok);
  const show = v[portraitSlotFields.show] !== '0';
  const consent = v[portraitSlotFields.consent] === '1';
  const current = eligible.find((a) => a.id === v[portraitSlotFields.assetId]) ?? eligible[0];
  const prev = eligible.find((a) => a.id === v[portraitSlotFields.prevAssetId] && a.id !== current?.id);
  if (!base || !current) return <p className="a-help">Portre tanımlı değil; sitede yazısal çerçeve görünür.</p>;

  const choose = (id: string) => {
    if (id === current.id) return;
    setValue(portraitSlotFields.prevAssetId, current.id);
    setValue(portraitSlotFields.assetId, id);
  };
  const num = (k: 'focalX' | 'focalY' | 'zoom') => v[portraitFields[k].id] ?? dec(base[k]);
  const field = (k: 'focalX' | 'focalY' | 'zoom') => (
    <TextField
      key={k}
      name={portraitFields[k].id}
      value={num(k)}
      onChange={(x) => setValue(portraitFields[k].id, x)}
      meta={{
        label: portraitFields[k].label,
        error: checkPortraitNumber(k, num(k)),
        helper:
          k === 'zoom'
            ? '1 = yakınlaştırma yok. Kırpma 4:5 çerçevede odak noktasına göre yapılır.'
            : '0 sol/üst, 100 sağ/alt kenar.',
        counter: { value: num(k).length, max: 6 },
      }}
    />
  );
  const alt = (l: 'tr' | 'en') => v[`${portraitFields.alt.id}.${l}`] ?? base.alt[l];
  const clearance = current.clearance === 'open';

  return (
    <div className="a-media-slot">
      <div className="a-media-preview">
        <Portrait locale={state.previewLang} sizes="240px" source={derived.portrait} />
        <p className="a-help">
          {show ? 'Önizleme: sitedeki 4:5 çerçeve.' : 'Portre gizli; sitede yazısal çerçeve görünür.'}
        </p>
      </div>
      <div className="a-media-form">
        <p className="a-help a-media-status">
          Durum:{' '}
          {clearance ? (
            <StatusChip kind="draft">Onay bekliyor</StatusChip>
          ) : (
            <span>{consent ? 'Sinem onayı kayıtlı' : 'Sinem onayı kaydedilmedi'}</span>
          )}
          {clearance && current.clearanceNote && <span> {current.clearanceNote}</span>}
        </p>
        <Segmented
          label="Portre göster"
          options={onOff}
          value={show ? '1' : '0'}
          onChange={(x) => setValue(portraitSlotFields.show, x)}
        />
        <div className="a-field">
          <label htmlFor="medya-portrait-asset" className="a-label">
            Portre görseli
          </label>
          <select
            id="medya-portrait-asset"
            className="a-input"
            value={current.id}
            onChange={(e) => choose(e.target.value)}
          >
            {eligible.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id} ({a.width} × {a.height})
              </option>
            ))}
          </select>
          <p className="a-help">
            Yalnızca yeterli boyutta gerçek fotoğraflar seçilebilir; geliştirme örnekleri seçilemez.
          </p>
          <button type="button" className="a-btn a-btn-quiet" disabled={!prev} onClick={() => prev && choose(prev.id)}>
            Önceki portreye dön
          </button>
        </div>
        <div className="a-field">
          <label className="a-check">
            <input
              type="checkbox"
              name={portraitSlotFields.consent}
              checked={consent}
              onChange={(e) => setValue(portraitSlotFields.consent, e.target.checked ? '1' : '0')}
            />
            <span>Sinem bu fotoğrafın kullanımını onayladı</span>
          </label>
          <p className="a-help">Yalnızca bir kayıt değeridir; önizlemedeki portreyi gizlemez.</p>
        </div>
        {field('focalX')}
        {field('focalY')}
        {field('zoom')}
        <BilingualField
          name={portraitFields.alt.id}
          label="Alternatif metin"
          max={portraitFields.alt.max}
          multiline
          tr={alt('tr')}
          en={alt('en')}
          onTr={(x) => setValue(`${portraitFields.alt.id}.tr`, x)}
          onEn={(x) => setValue(`${portraitFields.alt.id}.en`, x)}
          helper="Ekran okuyucular için; görseli doğru ve sade biçimde betimleyin."
        />
      </div>
    </div>
  );
}

function Card({ a, uses }: { a: MediaAsset; uses: string[] }) {
  return (
    <li className="a-media-card">
      <Thumb a={a} />
      <p className="a-media-id">{a.id}</p>
      <p className="a-help a-num">
        {a.kind} · {a.width} × {a.height}
      </p>
      <p className="a-help">{uses.length ? uses.join(', ') : 'Kullanılmıyor'}</p>
      <p className="a-media-chips">
        {a.fixture && <StatusChip kind="sample" />}
        {a.illustrative && !a.fixture && <StatusChip kind="draft">Örnek çizim</StatusChip>}
        {a.clearance === 'open' && <StatusChip kind="draft">Onay bekliyor</StatusChip>}
      </p>
    </li>
  );
}

/** Media library and the portrait slot. */
export function MediaEditor({
  assets,
  samples,
  usage,
  tasks,
}: {
  assets: MediaAsset[];
  samples: MediaAsset[];
  usage: Record<string, string[]>;
  tasks: string[];
}) {
  return (
    <>
      <PageHeader kicker="Pafta 05" title={screen.title} lede={screen.lede} />
      <Section
        id="portre"
        title="Portre"
        note="Aynı portre Ana sayfa Kısaca ve Profil’de görünür. Odak, yakınlaştırma ve alternatif metin buradan düzenlenir."
      >
        <PortraitSlot assets={assets} />
      </Section>
      <Section id="kitaplik" title="Görsel kitaplığı" note="Depodaki dosyalar; yükleme bu aşamada yok.">
        <div className="a-field">
          <button type="button" className="a-btn" disabled aria-describedby="medya-upload-help">
            Yükle
          </button>
          <p className="a-help" id="medya-upload-help">
            Prototipte dosya yükleme yok; görseller depodaki dosyalardan seçilir.
          </p>
        </div>
        {tasks.length > 0 && (
          <ul className="a-help a-media-tasks" aria-label="Açık işler">
            {tasks.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
        <ul className="a-media-grid" aria-label="Görseller">
          {assets.map((a) => (
            <Card key={a.id} a={a} uses={usage[a.id] ?? []} />
          ))}
        </ul>
      </Section>
      {samples.length > 0 && (
        <Section
          id="ornekler"
          title="Geliştirme örnekleri"
          note="Yalnızca geliştirmede görünür; portre olarak seçilemez."
        >
          <ul className="a-media-grid" aria-label="Geliştirme örnekleri">
            {samples.map((a) => (
              <Card key={a.id} a={a} uses={usage[a.id] ?? []} />
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
