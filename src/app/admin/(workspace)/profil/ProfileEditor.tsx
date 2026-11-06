'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Portrait } from '@/components/Portrait';
import { getSiteContent } from '@/content/site-content';
import { monthYear } from '@/lib/format';
import { interestsField, type CopyKey } from '@/lib/preview-bridge';
import {
  blank,
  blankItem,
  checkAct,
  checkEdu,
  checkExp,
  checkGroup,
  checkLang,
  checkMem,
  coreIds,
  isCore,
  listErr,
  profileIds,
  profileLimits,
  recsOf,
  type ActRec,
  type EduRec,
  type Errs,
  type ExpRec,
  type LangRec,
  type MemRec,
  type Pair,
  type SkillGroupRec,
  type SkillItemRec,
} from '@/lib/profile-fields';
import { BilingualField, Disclosure, ListEditor, RecordRow, Segmented, TextField } from '../../ui/controls';
import { Readout, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { screenBySlug, sheetLabel } from '../../screens';
import { CopyGroup, CopyStatus, TopicsEditor, useJsonList } from '../ana-sayfa/SectionEditors';

const screen = screenBySlug('profil')!;
const nonEmpty = (e: Errs) => Object.keys(e).length > 0;
const move = <T,>(list: T[], i: number, d: -1 | 1): T[] => {
  const n = [...list];
  [n[i], n[i + d]] = [n[i + d], n[i]];
  return n;
};

/** One bilingual pair of a record, with its validation messages and missing-language chips. */
function Bi({
  name,
  label,
  value,
  onChange,
  errs,
  k,
  max,
  multiline,
  optional,
  helper,
}: {
  name: string;
  label: string;
  value: Pair;
  onChange: (p: Pair) => void;
  errs: Errs;
  k: string;
  max: number;
  multiline?: boolean;
  optional?: boolean;
  helper?: string;
}) {
  return (
    <BilingualField
      name={name}
      label={label}
      helper={helper}
      max={max}
      multiline={multiline}
      optional={optional}
      tr={value.tr}
      en={value.en}
      onTr={(x) => onChange({ ...value, tr: x })}
      onEn={(x) => onChange({ ...value, en: x })}
      errors={{ tr: errs[`${k}.tr`], en: errs[`${k}.en`] }}
    />
  );
}

function Txt({
  name,
  label,
  value,
  onChange,
  error,
  max,
  helper,
  required,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  max?: number;
  helper?: string;
  required?: boolean;
}) {
  return (
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      meta={{ label, helper, error, required, counter: max ? { value: value.length, max } : undefined }}
    />
  );
}

/** Record list state: the JSON array lives in the shared mock store under the field id the preview bridge reads. */
function useRecs<R>(key: keyof typeof profileIds, seed: () => R[]) {
  const [initial] = useState(seed);
  const [list, setList] = useJsonList<R>(profileIds[key], initial);
  const patch = (i: number, p: Partial<R>) => setList(list.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return { list, setList, patch };
}

function Status({ errors, note }: { errors: number; note?: string }) {
  return (
    <div className="a-hero-status" role="status">
      <StatusChip kind={errors ? 'missing' : 'ready'}>
        {errors ? `${errors} kayıtta hata` : 'Kayıtlar geçerli'}
      </StatusChip>
      <p className="a-help">
        {errors ? 'Hatalı bir liste önizlemeye uygulanmaz; önizleme son geçerli (varsayılan) kayıtları gösterir. ' : ''}
        {note}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ Eğitim ------------------------------------------------------------------ */

function EducationEditor() {
  const c = getSiteContent();
  const { list, setList, patch } = useRecs<EduRec>('education', () => recsOf.education(c.education));
  const errs = list.map(checkEdu);
  const lerr = listErr(
    'education',
    list.map((r) => r.id),
  );
  const L = profileLimits.education;
  return (
    <>
      <Status
        errors={errs.filter(nonEmpty).length + (lerr ? 1 : 0)}
        note="Doğuş ve İMKB kayıtları Ana sayfa türetilmiş alanlarını (bölüm, üniversite, mezuniyet, lise, F1 ve F3) besler; silinemez."
      />
      {lerr && <p className="a-err">Hata: {lerr}</p>}
      <ListEditor
        label="Eğitim kayıtları"
        min={2}
        max={L.count}
        count={list.length}
        onAdd={() => setList([...list, blank.education()])}
        addLabel="Eğitim kaydı ekle"
      >
        {list.map((r, i) => {
          const core = isCore('education', r.id);
          const e = errs[i];
          const precision = r.id === 'dogus' ? 'month' : r.id === 'imkb' ? 'year' : r.precision;
          return (
            <RecordRow
              key={r.id}
              index={i}
              meta={core ? `${r.id} · korunan` : r.id}
              itemLabel="Eğitim kaydı"
              onUp={i > 0 ? () => setList(move(list, i, -1)) : undefined}
              onDown={i < list.length - 1 ? () => setList(move(list, i, 1)) : undefined}
              onRemove={core ? undefined : () => setList(list.filter((x) => x.id !== r.id))}
            >
              <Bi
                name={`egitim.${r.id}.institution`}
                label="Kurum"
                value={r.institution}
                onChange={(p) => patch(i, { institution: p })}
                errs={e}
                k="institution"
                max={L.institution}
              />
              <Bi
                name={`egitim.${r.id}.program`}
                label="Program"
                value={r.program}
                onChange={(p) => patch(i, { program: p })}
                errs={e}
                k="program"
                max={L.program}
                optional={r.id !== 'dogus'}
              />
              <Bi
                name={`egitim.${r.id}.stage`}
                label="Aşama"
                value={r.stage}
                onChange={(p) => patch(i, { stage: p })}
                errs={e}
                k="stage"
                max={L.stage}
                optional={r.id !== 'dogus'}
              />
              {core ? (
                <p className="a-help">
                  Dönem duyarlılığı bu kayıt için sabittir: {precision === 'month' ? 'ay' : 'yıl'}.
                </p>
              ) : (
                <Segmented
                  label={`${r.id}: dönem duyarlılığı`}
                  value={r.precision}
                  options={[
                    { value: 'year', label: 'Yıl' },
                    { value: 'month', label: 'Ay' },
                  ]}
                  onChange={(v) => patch(i, { precision: v, start: '', end: '' })}
                />
              )}
              <Txt
                name={`egitim.${r.id}.start`}
                label={precision === 'month' ? 'Başlangıç (YYYY-AA)' : 'Başlangıç (YYYY)'}
                value={r.start}
                onChange={(v) => patch(i, { start: v })}
                error={e.start}
                required
                max={7}
              />
              <Txt
                name={`egitim.${r.id}.end`}
                label={precision === 'month' ? 'Bitiş (YYYY-AA)' : 'Bitiş (YYYY)'}
                value={r.end}
                onChange={(v) => patch(i, { end: v })}
                error={e.end}
                required={r.id === 'dogus'}
                max={7}
                helper={
                  r.id === 'dogus'
                    ? 'Beklenen mezuniyet ayı; Hero, Kısaca ve Profil ile Kuvvetler F3 bu değerden türetilir.'
                    : undefined
                }
              />
              {!core && (
                <div className="a-field">
                  <p className="a-label">Beklenen bitiş</p>
                  <Segmented
                    label={`${r.id}: beklenen`}
                    value={r.expected ? '1' : '0'}
                    options={[
                      { value: '0', label: 'Tamamlandı' },
                      { value: '1', label: 'Beklenen' },
                    ]}
                    onChange={(v) => patch(i, { expected: v === '1' })}
                  />
                </div>
              )}
              {core && r.id === 'dogus' && (
                <p className="a-help">“Beklenen” işareti bu kayıtta sabittir (mezuniyet henüz gerçekleşmedi).</p>
              )}
              <Txt
                name={`egitim.${r.id}.score`}
                label="Mezuniyet puanı (100 üzerinden)"
                value={r.score}
                onChange={(v) => patch(i, { score: v })}
                error={e.score}
                max={8}
                helper={
                  r.id === 'imkb'
                    ? 'Kuvvetler F1 ve Kısaca lise satırı bu değeri kullanır.'
                    : 'İsteğe bağlı. Yalnızca doğrulanmış puanı yazın.'
                }
              />
            </RecordRow>
          );
        })}
      </ListEditor>
    </>
  );
}

/* ------------------------------------------------------------------ Deneyim ------------------------------------------------------------------ */

function ExperienceEditor() {
  const c = getSiteContent();
  const { derived } = useAdmin();
  const { list, patch } = useRecs<ExpRec>('experience', () => recsOf.experience(c.experience));
  const errs = list.map(checkExp);
  const L = profileLimits.experience;
  const x = derived.experience[0];
  return (
    <>
      <Status
        errors={errs.filter(nonEmpty).length}
        note="Staj kaydı Atölye, Hero, Kısaca ve Kuvvetler F6 alanlarını besler. Yeni deneyim kaydı bu sürümde eklenemez; Ana sayfa yalnızca bu staj kaydına bağlıdır."
      />
      <ListEditor
        label="Staj ve iş deneyimi"
        min={1}
        max={L.count}
        count={list.length}
        onAdd={() => undefined}
        addLabel="Deneyim ekle"
      >
        {list.map((r, i) => {
          const e = errs[i];
          return (
            <RecordRow key={r.id} index={i} meta={`${r.id} · korunan`} itemLabel="Deneyim kaydı">
              <Txt
                name={`deneyim.${r.id}.organization`}
                label="Kurum"
                value={r.organization}
                onChange={(v) => patch(i, { organization: v })}
                error={e.organization}
                required
                max={L.organization}
                helper="Kurum adı dile göre değişmez; Hero, Atölye, Kuvvetler F6 ve Kısaca aynı değeri kullanır."
              />
              <Bi
                name={`deneyim.${r.id}.role`}
                label="Rol"
                value={r.role}
                onChange={(p) => patch(i, { role: p })}
                errs={e}
                k="role"
                max={L.role}
              />
              <Txt
                name={`deneyim.${r.id}.month`}
                label="Staj ayı (YYYY-AA)"
                value={r.month}
                onChange={(v) => patch(i, { month: v })}
                error={e.month}
                required
                max={7}
                helper="Hero staj satırı, Kısaca özeti, Kuvvetler F6 dönemi ve metin içindeki staj ayı bu değerden türetilir."
              />
              <Bi
                name={`deneyim.${r.id}.duration`}
                label="Süre"
                value={r.duration}
                onChange={(p) => patch(i, { duration: p })}
                errs={e}
                k="duration"
                max={L.duration}
              />
              <Bi
                name={`deneyim.${r.id}.place`}
                label="Yer"
                value={r.place}
                onChange={(p) => patch(i, { place: p })}
                errs={e}
                k="place"
                max={L.place}
              />
            </RecordRow>
          );
        })}
      </ListEditor>
      <Disclosure
        label="Uygulanan ve gözlemlenen süreçler (salt okunur)"
        meta={<span className="a-sfx">kaynak: Ana sayfa › Atölye</span>}
      >
        <dl className="a-readouts">
          <Readout derived label="Uyguladım" value={x.applied.length} />
          <Readout derived label="Gözlemledim" value={x.observed.length} />
          <Readout derived label="Staj ayı (TR)" value={monthYear(x.month, 'tr')} />
        </dl>
        <p className="a-help">
          Süreç listesi tek yerde, <Link href="/admin/ana-sayfa#bolum-atolye">Ana sayfa › Atölye</Link> bölümünde
          düzenlenir; Profil sayfasındaki Deneyim paneli aynı listeyi gösterir.
        </p>
      </Disclosure>
      <CopyStatus keys={['experienceIntro']} />
      <CopyGroup keys={['experienceIntro']} />
    </>
  );
}

/* ------------------------------------------------------------------ Topluluk ------------------------------------------------------------------ */

function CommunityEditor() {
  const c = getSiteContent();
  const { list, setList, patch } = useRecs<MemRec>('memberships', () => recsOf.memberships(c.memberships));
  const errs = list.map(checkMem);
  const lerr = listErr(
    'memberships',
    list.map((r) => r.id),
  );
  const L = profileLimits.memberships;
  return (
    <>
      <Status
        errors={errs.filter(nonEmpty).length + (lerr ? 1 : 0)}
        note="IEEE RAS kaydı Kuvvetler F4 ve Kısaca topluluk satırını besler; silinemez. F4’ün açıklama metni Ana sayfa › Kuvvetler’de yazılır."
      />
      {lerr && <p className="a-err">Hata: {lerr}</p>}
      <ListEditor
        label="Topluluk kayıtları"
        min={1}
        max={L.count}
        count={list.length}
        onAdd={() => setList([...list, blank.membership()])}
        addLabel="Topluluk ekle"
      >
        {list.map((r, i) => {
          const core = isCore('memberships', r.id);
          const e = errs[i];
          return (
            <RecordRow
              key={r.id}
              index={i}
              meta={core ? `${r.id} · korunan` : r.id}
              itemLabel="Topluluk kaydı"
              onUp={i > 0 ? () => setList(move(list, i, -1)) : undefined}
              onDown={i < list.length - 1 ? () => setList(move(list, i, 1)) : undefined}
              onRemove={core ? undefined : () => setList(list.filter((x) => x.id !== r.id))}
            >
              <Txt
                name={`topluluk.${r.id}.organization`}
                label="Kuruluş"
                value={r.organization}
                onChange={(v) => patch(i, { organization: v })}
                error={e.organization}
                required
                max={L.organization}
              />
              <Txt
                name={`topluluk.${r.id}.abbr`}
                label="Kısaltma"
                value={r.abbr}
                onChange={(v) => patch(i, { abbr: v })}
                error={e.abbr}
                required={r.id === 'ieee-ras'}
                max={L.abbr}
                helper="Kısaca özetinde ve Kuvvetler kısa etiketinde kullanılır."
              />
              <Bi
                name={`topluluk.${r.id}.team`}
                label="Ekip (özet satırı)"
                value={r.team}
                onChange={(p) => patch(i, { team: p })}
                errs={e}
                k="team"
                max={L.team}
                optional={r.id !== 'ieee-ras'}
              />
              <Bi
                name={`topluluk.${r.id}.role`}
                label="Rol"
                value={r.role}
                onChange={(p) => patch(i, { role: p })}
                errs={e}
                k="role"
                max={L.role}
              />
              <Txt
                name={`topluluk.${r.id}.start`}
                label="Başlangıç yılı (YYYY)"
                value={r.start}
                onChange={(v) => patch(i, { start: v })}
                error={e.start}
                required
                max={4}
              />
              <Txt
                name={`topluluk.${r.id}.end`}
                label="Bitiş yılı (YYYY)"
                value={r.end}
                onChange={(v) => patch(i, { end: v })}
                error={e.end}
                max={4}
              />
              <Bi
                name={`topluluk.${r.id}.text`}
                label="Açıklama"
                value={r.text}
                onChange={(p) => patch(i, { text: p })}
                errs={e}
                k="text"
                max={L.text}
                multiline
              />
            </RecordRow>
          );
        })}
      </ListEditor>
      <CopyStatus keys={['rastageNote']} />
      <CopyGroup keys={['rastageNote']} />
    </>
  );
}

/* ------------------------------------------------------------------ Yetkinlikler ------------------------------------------------------------------ */

const SUMMARY_OPTS = [
  { value: '', label: 'Özette yok' },
  { value: 'tool', label: 'Araç' },
  { value: 'competency', label: 'Yetkinlik' },
] as const;

function SkillsEditor() {
  const c = getSiteContent();
  const { list, setList, patch } = useRecs<SkillGroupRec>('skills', () => recsOf.skills(c.skillGroups));
  const errs = list.map(checkGroup);
  const L = profileLimits.skills;
  const setItems = (gi: number, items: SkillItemRec[]) => patch(gi, { items });
  return (
    <>
      <Status
        errors={errs.filter(nonEmpty).length}
        note="“Araç” ve “Yetkinlik” işaretli öğeler Kısaca özetindeki Araçlar ve Yetkinlik satırlarını üretir. Düzey ya da yetkinlik iddiası eklemeyin; yalnızca doğrulanmış becerileri yazın."
      />
      <ListEditor
        label="Yetkinlik grupları"
        min={1}
        max={L.groups}
        count={list.length}
        onAdd={() => setList([...list, blank.group()])}
        addLabel="Grup ekle"
      >
        {list.map((g, gi) => {
          const e = errs[gi];
          return (
            <RecordRow
              key={g.id}
              index={gi}
              meta={g.id}
              itemLabel="Grup"
              onUp={gi > 0 ? () => setList(move(list, gi, -1)) : undefined}
              onDown={gi < list.length - 1 ? () => setList(move(list, gi, 1)) : undefined}
              onRemove={list.length > 1 ? () => setList(list.filter((x) => x.id !== g.id)) : undefined}
            >
              <Bi
                name={`yet.${g.id}.name`}
                label="Grup adı"
                value={g.name}
                onChange={(p) => patch(gi, { name: p })}
                errs={e}
                k="name"
                max={L.group}
              />
              {e.items && <p className="a-err">Hata: {e.items}</p>}
              <ListEditor
                label="Yetkinlikler"
                min={1}
                max={L.items}
                count={g.items.length}
                onAdd={() => setItems(gi, [...g.items, blankItem()])}
                addLabel="Yetkinlik ekle"
              >
                {g.items.map((it, ii) => (
                  <RecordRow
                    key={ii}
                    index={ii}
                    itemLabel="Yetkinlik"
                    onUp={ii > 0 ? () => setItems(gi, move(g.items, ii, -1)) : undefined}
                    onDown={ii < g.items.length - 1 ? () => setItems(gi, move(g.items, ii, 1)) : undefined}
                    onRemove={
                      g.items.length > 1
                        ? () =>
                            setItems(
                              gi,
                              g.items.filter((_, j) => j !== ii),
                            )
                        : undefined
                    }
                  >
                    <Bi
                      name={`yet.${g.id}.${ii}.name`}
                      label="Ad"
                      value={it.name}
                      onChange={(p) =>
                        setItems(
                          gi,
                          g.items.map((x, j) => (j === ii ? { ...x, name: p } : x)),
                        )
                      }
                      errs={e}
                      k={`items.${ii}.name`}
                      max={L.name}
                    />
                    <Bi
                      name={`yet.${g.id}.${ii}.context`}
                      label="Bağlam (örn. staj)"
                      value={it.context}
                      optional
                      onChange={(p) =>
                        setItems(
                          gi,
                          g.items.map((x, j) => (j === ii ? { ...x, context: p } : x)),
                        )
                      }
                      errs={e}
                      k={`items.${ii}.context`}
                      max={L.context}
                      helper="Yalnızca bilindiği yerde: ad yanında parantez içinde görünür."
                    />
                    <Segmented
                      label={`${g.id} ${ii + 1}: özet`}
                      value={it.summary}
                      options={[...SUMMARY_OPTS]}
                      onChange={(v) =>
                        setItems(
                          gi,
                          g.items.map((x, j) => (j === ii ? { ...x, summary: v } : x)),
                        )
                      }
                    />
                    {it.summary === 'competency' && (
                      <Bi
                        name={`yet.${g.id}.${ii}.sn`}
                        label="Özet kısa adı"
                        value={it.summaryName}
                        optional
                        onChange={(p) =>
                          setItems(
                            gi,
                            g.items.map((x, j) => (j === ii ? { ...x, summaryName: p } : x)),
                          )
                        }
                        errs={e}
                        k={`items.${ii}.summaryName`}
                        max={L.summaryName}
                        helper="Boşsa özet satırında ad kullanılır."
                      />
                    )}
                  </RecordRow>
                ))}
              </ListEditor>
            </RecordRow>
          );
        })}
      </ListEditor>
    </>
  );
}

/* ------------------------------------------------------------------ Diller ------------------------------------------------------------------ */

function LanguagesEditor() {
  const c = getSiteContent();
  const { list, setList, patch } = useRecs<LangRec>('languages', () => recsOf.languages(c.languages));
  const errs = list.map(checkLang);
  const L = profileLimits.languages;
  return (
    <>
      <Status
        errors={errs.filter(nonEmpty).length}
        note="Düzey boşsa sayfada düzey etiketi görünmez (Türkçe için düzey, Sinem onaylayana kadar yazılmaz). Özet kısa ifadesi Kısaca “Diller” satırını üretir."
      />
      <ListEditor
        label="Diller"
        min={1}
        max={L.count}
        count={list.length}
        onAdd={() => setList([...list, blank.language()])}
        addLabel="Dil ekle"
      >
        {list.map((r, i) => (
          <RecordRow
            key={r.id}
            index={i}
            meta={r.id}
            itemLabel="Dil"
            onUp={i > 0 ? () => setList(move(list, i, -1)) : undefined}
            onDown={i < list.length - 1 ? () => setList(move(list, i, 1)) : undefined}
            onRemove={list.length > 1 ? () => setList(list.filter((x) => x.id !== r.id)) : undefined}
          >
            <Bi
              name={`dil.${r.id}.name`}
              label="Dil adı"
              value={r.name}
              onChange={(p) => patch(i, { name: p })}
              errs={errs[i]}
              k="name"
              max={L.name}
            />
            <Bi
              name={`dil.${r.id}.level`}
              label="Düzey"
              value={r.level}
              optional
              onChange={(p) => patch(i, { level: p })}
              errs={errs[i]}
              k="level"
              max={L.level}
            />
            <Bi
              name={`dil.${r.id}.short`}
              label="Özet kısa ifadesi"
              value={r.short}
              optional
              onChange={(p) => patch(i, { short: p })}
              errs={errs[i]}
              k="short"
              max={L.short}
            />
          </RecordRow>
        ))}
      </ListEditor>
    </>
  );
}

/* ------------------------------------------------------------------ İlgi alanları ------------------------------------------------------------------ */

function InterestsEditor() {
  const c = getSiteContent();
  const [list, setList] = useJsonList<Pair>(
    interestsField.id,
    c.interests.map((p) => ({ tr: p.tr, en: p.en })),
  );
  const edit = (i: number, p: Pair) => setList(list.map((x, j) => (j === i ? p : x)));
  return (
    <>
      <p className="a-help">
        Tek liste: Hero, Yönelim, Kuvvetler bileşke metni ve bu sayfa aynı kayıtları kullanır. Ana sayfa › Yönelim ile
        aynı alan.
      </p>
      <ListEditor
        label="İlgi alanları"
        min={1}
        max={interestsField.count}
        count={list.length}
        onAdd={() => setList([...list, { tr: '', en: '' }])}
        addLabel="İlgi alanı ekle"
      >
        {list.map((p, i) => (
          <RecordRow
            key={i}
            index={i}
            itemLabel="İlgi alanı"
            onUp={i > 0 ? () => setList(move(list, i, -1)) : undefined}
            onDown={i < list.length - 1 ? () => setList(move(list, i, 1)) : undefined}
            onRemove={list.length > 1 ? () => setList(list.filter((_, j) => j !== i)) : undefined}
          >
            <BilingualField
              name={`ilgi.${i}`}
              label={`İlgi alanı ${i + 1}`}
              tr={p.tr}
              en={p.en}
              max={interestsField.max}
              onTr={(x) => edit(i, { ...p, tr: x })}
              onEn={(x) => edit(i, { ...p, en: x })}
            />
          </RecordRow>
        ))}
      </ListEditor>
    </>
  );
}

/* ------------------------------------------------------------------ Etkinlikler ------------------------------------------------------------------ */

function ActivitiesEditor() {
  const c = getSiteContent();
  const { list, setList, patch } = useRecs<ActRec>('activities', () => recsOf.activities(c.activities));
  const errs = list.map(checkAct);
  const L = profileLimits.activities;
  return (
    <>
      <Status
        errors={errs.filter(nonEmpty).length}
        note="Kuvvetler F2 (takım sporları) kaydının metni Ana sayfa › Kuvvetler’de ayrı yazılır; bu liste yalnızca Profil sayfasındaki kayıtları belirler."
      />
      <ListEditor
        label="Kişisel etkinlikler"
        min={0}
        max={L.count}
        count={list.length}
        onAdd={() => setList([...list, blank.activity()])}
        addLabel="Etkinlik ekle"
      >
        {list.map((r, i) => (
          <RecordRow
            key={r.id}
            index={i}
            meta={r.id}
            itemLabel="Etkinlik"
            onUp={i > 0 ? () => setList(move(list, i, -1)) : undefined}
            onDown={i < list.length - 1 ? () => setList(move(list, i, 1)) : undefined}
            onRemove={() => setList(list.filter((x) => x.id !== r.id))}
          >
            <Bi
              name={`etk.${r.id}.name`}
              label="Ad"
              value={r.name}
              onChange={(p) => patch(i, { name: p })}
              errs={errs[i]}
              k="name"
              max={L.name}
            />
            <Txt
              name={`etk.${r.id}.start`}
              label="Başlangıç yılı (isteğe bağlı)"
              value={r.start}
              onChange={(v) => patch(i, { start: v })}
              error={errs[i].start}
              max={4}
            />
            <Txt
              name={`etk.${r.id}.end`}
              label="Bitiş yılı (isteğe bağlı)"
              value={r.end}
              onChange={(v) => patch(i, { end: v })}
              error={errs[i].end}
              max={4}
            />
          </RecordRow>
        ))}
      </ListEditor>
      <CopyStatus keys={['offField', 'teamSportNote']} />
      <CopyGroup keys={['offField', 'teamSportNote']} />
    </>
  );
}

/* ------------------------------------------------------------------ Portre ------------------------------------------------------------------ */

function PortraitEditor() {
  const { state, derived } = useAdmin();
  return (
    <>
      <div className="a-media-mini">
        <Portrait locale={state.previewLang} sizes="96px" source={derived.portrait} />
      </div>
      <p className="a-help">
        Portre görseli, odak noktası, yakınlaştırma ve alternatif metin Medya ekranında düzenlenir.{' '}
        <Link href="/admin/medya">Medya’da düzenle</Link>
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ Ekran ------------------------------------------------------------------ */

const INTRO_KEYS: CopyKey[] = ['profileLead', 'profileBody', 'profileNow', 'profileNowValue'];
const LABEL_KEYS: CopyKey[] = [
  'profileH1',
  'profileIndex',
  'profileOnThisPage',
  'profileExpected',
  'profileScore',
  'profileAcademic',
  'profileInterestsCaption',
];
const SECTION_KEYS: CopyKey[] = [
  'secEducation',
  'secExperience',
  'secCommunity',
  'secSkills',
  'secLanguages',
  'secInterests',
  'secOffField',
];

export function ProfileEditor() {
  const { derived } = useAdmin();
  return (
    <>
      <PageHeader kicker={sheetLabel('profil')} title={screen.title} lede={screen.lede} />
      <p className="a-help">
        Çekirdek kayıtlar ({[...coreIds.education, ...coreIds.experience, ...coreIds.memberships].join(', ')}) başka
        alanların kaynağıdır ve silinemez. Bu kayıtlar değiştiğinde Ana sayfadaki türetilmiş alanlar aynı anda
        güncellenir. Tüm işlemler simülasyondur.
      </p>

      <Section
        id="giris"
        title="Giriş ve durum"
        note="Kişisel ses taşıyan metin: onayınız olmadan yayına hazır sayılmaz. Ad ve soyad Site ayarları › Kimlik’tedir."
      >
        <CopyStatus keys={INTRO_KEYS} />
        <CopyGroup keys={INTRO_KEYS} />
        <dl className="a-readouts">
          <Readout derived label="Ad Soyad" value={derived.ownerName} />
          <Readout derived label="Bölüm" value={derived.education[0].program?.tr ?? '—'} />
          <Readout
            derived
            label="Beklenen mezuniyet"
            value={monthYear(`${derived.education[0].period.end}-01`, 'tr')}
          />
        </dl>
      </Section>
      <Section id="egitim" title="Eğitim" note="Okul kayıtları, dönemler ve mezuniyet bilgisi; akademik ilgi alanları.">
        <EducationEditor />
        <CopyStatus keys={['academicIntro', 'academicNote']} />
        <CopyGroup keys={['academicIntro', 'academicNote']} />
        <p className="a-help">
          Akademik ilgi alanları Yaklaşım bölümüyle ortak listedir (Ana sayfa › Yaklaşım ile aynı alan).
        </p>
        <TopicsEditor />
      </Section>
      <Section
        id="deneyim"
        title="Deneyim"
        note="Staj kaydı; Ana sayfadaki Atölye, Hero ve Kuvvetler F6 aynı kayıtla beslenir."
      >
        <ExperienceEditor />
      </Section>
      <Section id="topluluk" title="Topluluk" note="IEEE ve diğer topluluk çalışmaları.">
        <CommunityEditor />
      </Section>
      <Section id="yetkinlikler" title="Yetkinlikler" note="Gruplanmış araçlar ve yetkinlikler.">
        <SkillsEditor />
      </Section>
      <Section id="diller" title="Diller" note="Dil adları ve düzeyleri.">
        <LanguagesEditor />
      </Section>
      <Section id="ilgi" title="İlgi alanları" note="Gelecekte çalışılmak istenen alanlar.">
        <InterestsEditor />
      </Section>
      <Section id="etkinlikler" title="Kişisel etkinlikler" note="Spor takımları ve okul etkinlikleri.">
        <ActivitiesEditor />
      </Section>
      <Section id="portre" title="Portre" note="Portre ayarları Medya ekranındadır.">
        <PortraitEditor />
      </Section>
      <Section id="etiketler" title="Etiketler ve başlıklar" note="Profil sayfasındaki sabit metinler.">
        <CopyStatus keys={[...LABEL_KEYS, ...SECTION_KEYS]} />
        <CopyGroup keys={LABEL_KEYS} />
        <Disclosure label="Bölüm başlıkları" meta={<span className="a-sfx">7 metin çifti</span>}>
          <CopyGroup keys={SECTION_KEYS} />
        </Disclosure>
      </Section>
    </>
  );
}
