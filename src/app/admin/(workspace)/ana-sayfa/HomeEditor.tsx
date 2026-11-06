'use client';

import { BilingualField, ListEditor, RecordRow } from '../../ui/controls';
import { BeamEditor, type BeamSeed } from './BeamEditor';
import { ForcesEditor, type ForcesSeed } from './ForcesEditor';
import { HeroEditor, type HeroSeed } from './HeroEditor';
import {
  ContactEditor,
  DirectionEditor,
  GlobalEditor,
  IntroEditor,
  TopicsEditor,
  WorkEditor,
  WorkshopEditor,
} from './SectionEditors';
import { PageHeader, Section } from '../../ui/PageHeader';
import { screenBySlug } from '../../screens';
import { useAdmin } from '../../ui/store';

type Pair = { tr: string; en: string };
type Seed = {
  hero: HeroSeed;
  forces: ForcesSeed;
  beam: BeamSeed;
  lead: Pair;
  interests: Pair[];
};

const screen = screenBySlug('ana-sayfa')!;

/** Ana sayfa editor, first slice: proves the field controls, bilingual pair, list editor and index wiring.
 *  The full registry-driven editor arrives in the next stage. */
export function HomeEditor({ seed }: { seed: Seed }) {
  const { state, setValue } = useAdmin();
  const v = (id: string, fallback: string) => state.values[id] ?? fallback;

  let list: Pair[] = seed.interests;
  try {
    const raw = state.values['yonelim.list'];
    if (raw) list = JSON.parse(raw) as Pair[];
  } catch {
    /* keep seed */
  }
  const setList = (next: Pair[]) => setValue('yonelim.list', JSON.stringify(next));
  const edit = (i: number, k: 'tr' | 'en', val: string) =>
    setList(list.map((p, j) => (j === i ? { ...p, [k]: val } : p)));
  const move = (i: number, d: -1 | 1) => {
    const n = [...list];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setList(n);
  };

  return (
    <>
      <PageHeader kicker="Pafta 01" title={screen.title} lede={screen.lede} />

      <Section
        id="hero"
        title="Hero"
        note="Adın çevresindeki kesikli çerçeve, yan sütun ve ilgi alanları. Her alan önizlemedeki gerçek Hero’yu değiştirir."
      >
        <HeroEditor seed={seed.hero} />
      </Section>

      <Section id="kisaca" title="Kısaca" note="Kişisel ses taşıyan metin: onayınız olmadan yayına hazır sayılmaz.">
        <BilingualField
          name="kisaca.lead"
          label="Tanıtım cümlesi"
          multiline
          draft
          max={200}
          helper="Kısaca bölümünün ilk cümlesi. Yazarın onayını bekleyen taslak metin."
          tr={v('kisaca.lead.tr', seed.lead.tr)}
          en={v('kisaca.lead.en', seed.lead.en)}
          onTr={(x) => setValue('kisaca.lead.tr', x)}
          onEn={(x) => setValue('kisaca.lead.en', x)}
        />
        <IntroEditor />
      </Section>

      <Section
        id="kuvvetler"
        title="Kuvvetler"
        note="Altı etki kaydı, vektör girdileri ve hesaplanan bileşke. Sağdaki gerçek Kuvvetler diyagramı ve Hero birlikte güncellenir."
      >
        <ForcesEditor seed={seed.forces} />
      </Section>

      <Section
        id="atolye"
        title="Atölye"
        note="Staj atölyesinde uygulanan ve yalnızca gözlemlenen süreçler. Sağdaki gerçek Atölye bölümü birlikte güncellenir."
      >
        <WorkshopEditor />
      </Section>

      <Section
        id="yaklasim"
        title="Yaklaşım"
        note="Kiriş diyagramının metinleri ve varsayılan yük konumu a₀. Sağdaki gerçek Yaklaşım bölümü ve kiriş birlikte güncellenir."
      >
        <BeamEditor seed={seed.beam} />
        <TopicsEditor />
      </Section>

      <Section
        id="calismalar"
        title="Çalışmalar"
        note="Bölüm metinleri, görünürlük ve öne çıkan proje. Yalnızca yayımlanmış ve onaylı projeler görünür; hiç proje yoksa tasarlanmış boş durum korunur."
      >
        <WorkEditor />
      </Section>

      <Section id="yonelim" title="Yönelim" note="Tek liste, bir kez düzenlenir; Hero, Yönelim ve Profil’de görünür.">
        <DirectionEditor />
        <ListEditor
          label="İlgi alanları"
          min={1}
          max={6}
          count={list.length}
          onAdd={() => setList([...list, { tr: '', en: '' }])}
          addLabel="İlgi alanı ekle"
        >
          {list.map((p, i) => (
            <RecordRow
              key={i}
              index={i}
              itemLabel="İlgi alanı"
              onUp={i > 0 ? () => move(i, -1) : undefined}
              onDown={i < list.length - 1 ? () => move(i, 1) : undefined}
              onRemove={list.length > 1 ? () => setList(list.filter((_, j) => j !== i)) : undefined}
            >
              <BilingualField
                name={`yonelim.${i}`}
                label={`İlgi alanı ${i + 1}`}
                tr={p.tr}
                en={p.en}
                max={32}
                onTr={(x) => edit(i, 'tr', x)}
                onEn={(x) => edit(i, 'en', x)}
              />
            </RecordRow>
          ))}
        </ListEditor>
      </Section>

      <Section
        id="iletisim"
        title="İletişim"
        note="E-posta, platform bağlantıları ve görünürlükleri; tek kaynak olarak İletişim, alt bilgi ve mobil menüyü besler."
      >
        <ContactEditor />
      </Section>

      <Section
        id="global"
        title="Üst ve alt bilgi"
        note="Her sayfada görünen gezinme, okunan bölüm adları ve antet altbilgisi."
      >
        <GlobalEditor />
      </Section>
    </>
  );
}
