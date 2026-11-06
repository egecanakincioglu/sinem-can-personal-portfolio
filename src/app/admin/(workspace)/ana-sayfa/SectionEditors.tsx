'use client';

import { useId, useState, type ReactNode } from 'react';
import { getSiteContent } from '@/content/site-content';
import { cachedFullDate as fullDate, cachedMonthYear as monthYear, cachedNum as num } from '@/lib/format';
import { resultant } from '@/lib/physics';
import {
  SUMMARY_COUNT,
  checkCopy,
  checkEmail,
  checkHandle,
  checkPlatformUrl,
  contactFields,
  copyDefault,
  copyFields,
  platformFieldId,
  summaryLabelField,
  topicsField,
  workViewFields,
  workshopField,
  type CopyField,
  type CopyKey,
  type TechniqueKind,
  type TechniqueRecord,
} from '@/lib/preview-bridge';
import { BilingualField, Disclosure, Field, ListEditor, RecordRow, Segmented, TextField } from '../../ui/controls';
import { EmptyState, Readout, StatusChip } from '../../ui/feedback';
import { useAdminContent } from '../../ui/store';
import { fieldMeta } from './fieldMeta';
import type { Pair } from './HeroEditor';

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
const pairOf = (c: { tr: string; en: string }): Pair => ({ tr: c.tr, en: c.en });

/** TR/EN completeness of a group of registry fields. A missing language is never filled from the other one. */
export function CopyStatus({ keys }: { keys: readonly CopyKey[] }) {
  const { state, derived } = useAdminContent();
  const n = { tr: 0, en: 0 };
  for (const k of keys) {
    const f = copyFields[k] as CopyField;
    const d = copyDefault(f, derived);
    if (!(state.values[`${f.id}.tr`] ?? d.tr).trim()) n.tr++;
    if (!(state.values[`${f.id}.en`] ?? d.en).trim()) n.en++;
  }
  return (
    <div className="a-hero-status" role="status">
      <StatusChip kind={n.tr ? 'missing' : 'ready'}>{n.tr ? `TR eksik: ${n.tr}` : 'TR tamam'}</StatusChip>{' '}
      <StatusChip kind={n.en ? 'missing' : 'ready'}>{n.en ? `EN eksik: ${n.en}` : 'EN tamam'}</StatusChip>
      <p className="a-help">Çeviri durumu bu bölümdeki {keys.length} metin çifti içindir.</p>
    </div>
  );
}

/** The generic editor: one bilingual control per registry key. Everything it writes is read back by lib/preview-bridge.ts. */
export function CopyGroup({ keys }: { keys: readonly CopyKey[] }) {
  const { state, setValue, derived } = useAdminContent();
  return (
    <>
      {keys.map((k) => {
        const f = copyFields[k] as CopyField;
        const m = fieldMeta[k] ?? { label: k };
        const d = copyDefault(f, derived);
        const tr = state.values[`${f.id}.tr`] ?? d.tr;
        const en = state.values[`${f.id}.en`] ?? d.en;
        return (
          <BilingualField
            key={f.id}
            name={f.id}
            label={m.label}
            helper={m.helper}
            max={f.max}
            multiline={m.multiline}
            draft={m.draft}
            tr={tr}
            en={en}
            onTr={(x) => setValue(`${f.id}.tr`, x)}
            onEn={(x) => setValue(`${f.id}.en`, x)}
            errors={{ tr: checkCopy(f, tr), en: checkCopy(f, en) }}
          />
        );
      })}
    </>
  );
}

export function useJsonList<T>(id: string, seed: T[]): [T[], (next: T[]) => void] {
  const { state, setValue } = useAdminContent();
  let list = seed;
  try {
    const raw = state.values[id];
    if (raw) {
      const p = JSON.parse(raw) as unknown;
      if (Array.isArray(p)) list = p as T[];
    }
  } catch {
    /* keep seed */
  }
  return [list, (next) => setValue(id, JSON.stringify(next))];
}

const flag = (v: string | undefined, fallback: boolean) => (v === '1' ? true : v === '0' ? false : fallback);
const onOff = [
  { value: '1', label: 'Göster' },
  { value: '0', label: 'Gizle' },
];

/* ------------------------------------------------------------------ Kısaca ------------------------------------------------------------------ */

const INTRO_KEYS = [
  'introBody',
  'introNote',
  'introHeading',
  'introSummary',
  'introFullProfile',
] as const satisfies readonly CopyKey[];

export function IntroEditor() {
  const { state, setValue, derived } = useAdminContent();
  const rows = derived.summaryRows; // values re-derived from the Profile records; labels as edited
  return (
    <>
      <CopyStatus keys={INTRO_KEYS} />
      <CopyGroup keys={['introBody', 'introNote']} />
      <Disclosure label="Etiketler" meta={<span className="a-sfx">3 metin çifti</span>}>
        <CopyGroup keys={['introHeading', 'introSummary', 'introFullProfile']} />
      </Disclosure>
      <Disclosure
        label="Özet satırları"
        meta={<span className="a-sfx">{SUMMARY_COUNT} etiket çifti · değerler türetilmiş</span>}
      >
        <p className="a-help">
          Dokuz satır sabittir. Etiketler burada yazılır; değerler Profil kayıtlarından (Eğitim, Deneyim, Topluluk,
          Yetkinlikler, Diller) türetilir ve salt okunurdur. Hero’daki etiketler ayrı alanlardır.
        </p>
        {rows.map((row, i) => {
          const f = summaryLabelField(i);
          const tr = state.values[`${f.id}.tr`] ?? row.label.tr;
          const en = state.values[`${f.id}.en`] ?? row.label.en;
          return (
            <div key={f.id}>
              <BilingualField
                name={f.id}
                label={`Satır ${i + 1} etiketi`}
                max={f.max}
                tr={tr}
                en={en}
                onTr={(x) => setValue(`${f.id}.tr`, x)}
                onEn={(x) => setValue(`${f.id}.en`, x)}
                errors={{ tr: checkCopy(f, tr), en: checkCopy(f, en) }}
              />
              <dl className="a-readouts">
                <Readout derived label={`Satır ${i + 1} değeri`} value={both(pairOf(row.value))} />
              </dl>
            </div>
          );
        })}
      </Disclosure>
    </>
  );
}

/* ------------------------------------------------------------------ Atölye ------------------------------------------------------------------ */

const WORKSHOP_KEYS = [
  'workshopHeading',
  'workshopInternship',
  'workshopAppliedHint',
  'workshopObservedHint',
] as const satisfies readonly CopyKey[];
const KIND_LABEL: Record<TechniqueKind, string> = { applied: 'Uyguladım', observed: 'Gözlemledim' };

function seedTechniques(): TechniqueRecord[] {
  const c = getSiteContent();
  const make = (kind: TechniqueKind, list: typeof c.applied): TechniqueRecord[] =>
    list.map((p, i) => ({
      id: `${kind === 'applied' ? 'a' : 'o'}${i + 1}`,
      kind,
      name: { tr: p.name.tr, en: p.name.en },
      note: { tr: p.note.tr, en: p.note.en },
    }));
  return [...make('applied', c.applied), ...make('observed', c.observed)];
}

export function WorkshopEditor() {
  const { state, derived: c } = useAdminContent();
  const exp = c.experience[0];
  const [list, setList] = useJsonList<TechniqueRecord>(workshopField.id, seedTechniques());
  const [pending, setPending] = useState<{ id: string; kind: TechniqueKind } | null>(null);
  const update = (id: string, patch: Partial<TechniqueRecord>) =>
    setList(list.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) => {
    const n = [...list];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setList(n);
  };
  const count = (k: TechniqueKind) => list.filter((r) => r.kind === k).length;
  const pendingRec = pending && list.find((r) => r.id === pending.id);
  const w = c.dict.workshop;

  return (
    <>
      <CopyStatus keys={WORKSHOP_KEYS} />
      <CopyGroup keys={WORKSHOP_KEYS} />

      <Disclosure label="Korumalı başlıklar" meta={<span className="a-sfx">salt okunur</span>}>
        <p className="a-help">
          “Uyguladım” ve “Gözlemledim” başlıkları sabittir: kişinin kendi yaptığı işi yalnızca izlediklerinden ayıran
          dürüstlük sınırıdır.
        </p>
        <dl className="a-readouts">
          <Readout locked label="“Uyguladım” başlığı" value={both(pairOf(w.applied))} />
          <Readout locked label="“Gözlemledim” başlığı" value={both(pairOf(w.observed))} />
        </dl>
      </Disclosure>

      <Disclosure label="Staj bilgisi (salt okunur)" meta={<span className="a-sfx">kaynak: Deneyim kaydı</span>}>
        <p className="a-help">
          Kurum, rol, süre ve yer tek bir kayıttan gelir (Deneyim, Profil düzenleyicisinde). Burada yalnızca gösterilir;
          Hero, Kuvvetler F6 ve Kısaca aynı kaydı kullanır.
        </p>
        <dl className="a-readouts">
          <Readout derived label="Kurum" value={exp.organization} />
          <Readout derived label="Rol" value={both(pairOf(w.role))} />
          <Readout derived label="Tarih" value={monthYear(exp.month, 'tr')} />
          <Readout derived label="Süre" value={both(pairOf(w.duration))} />
          <Readout derived label="Yer" value={both(pairOf(w.place))} />
        </dl>
      </Disclosure>

      <div className="a-hero-status" role="status">
        <StatusChip kind="ready">Uyguladım: {count('applied')}</StatusChip>{' '}
        <StatusChip kind="ready">Gözlemledim: {count('observed')}</StatusChip>
        <p className="a-help">
          Bir süreç yalnızca tek listede yer alır. Sınıf, kişinin kendi yaptığı işi yalnızca izlediklerinden ayırır;
          yalnızca doğrulanmış gerçekleri yazın.
        </p>
        {(count('applied') === 0 || count('observed') === 0) && (
          <p className="a-warn">Uyarı: Listelerden biri boş; Atölye’de o sütun boş görünür.</p>
        )}
      </div>

      <ListEditor
        label="Teknik kayıtlar"
        min={2}
        max={workshopField.count}
        count={list.length}
        onAdd={() =>
          setList([
            ...list,
            { id: `n${Date.now().toString(36)}`, kind: 'observed', name: { tr: '', en: '' }, note: { tr: '', en: '' } },
          ])
        }
        addLabel="Süreç ekle"
      >
        {list.map((r, i) => (
          <RecordRow
            key={r.id}
            index={i}
            meta={r.kind === 'applied' ? 'uyg.' : 'göz.'}
            itemLabel="Süreç"
            onUp={i > 0 ? () => move(i, -1) : undefined}
            onDown={i < list.length - 1 ? () => move(i, 1) : undefined}
            onRemove={list.length > 2 ? () => setList(list.filter((x) => x.id !== r.id)) : undefined}
          >
            <Segmented<TechniqueKind>
              label={`Süreç ${i + 1} sınıfı`}
              value={r.kind}
              options={[
                { value: 'applied', label: 'Uyguladım' },
                { value: 'observed', label: 'Gözlemledim' },
              ]}
              onChange={(k) => k !== r.kind && setPending({ id: r.id, kind: k })}
            />
            {pending?.id === r.id && pendingRec && (
              <div className="a-inline-confirm" role="alertdialog" aria-label="Sınıf değişikliğini onayla">
                <p className="a-warn">
                  “{pendingRec.name.tr || pendingRec.name.en || 'Bu süreç'}” {KIND_LABEL[pending.kind]} listesine
                  taşınsın mı? Bu, stajda kişinin kendi yaptığı iş ile yalnızca gözlemlediği süreç ayrımını değiştirir.
                </p>
                <button
                  type="button"
                  className="a-link"
                  onClick={() => {
                    update(r.id, { kind: pending.kind });
                    setPending(null);
                  }}
                >
                  Evet, taşı
                </button>{' '}
                <button type="button" className="a-link" onClick={() => setPending(null)}>
                  Vazgeç
                </button>
              </div>
            )}
            <BilingualField
              name={`atolye.rec.${r.id}.name`}
              label="Süreç adı"
              max={workshopField.nameMax}
              tr={r.name.tr}
              en={r.name.en}
              onTr={(x) => update(r.id, { name: { ...r.name, tr: x } })}
              onEn={(x) => update(r.id, { name: { ...r.name, en: x } })}
            />
            <BilingualField
              name={`atolye.rec.${r.id}.note`}
              label="Kısa açıklama"
              multiline
              max={workshopField.noteMax}
              tr={r.note.tr}
              en={r.note.en}
              onTr={(x) => update(r.id, { note: { ...r.note, tr: x } })}
              onEn={(x) => update(r.id, { note: { ...r.note, en: x } })}
            />
          </RecordRow>
        ))}
      </ListEditor>
      <p className="a-help">
        Sıra, her listenin içindeki görünüm sırasıdır. Kayıtlar kararlı kimlik taşır; değerler yalnızca bu tarayıcı
        oturumunda tutulur ({state.dirty ? 'kaydedilmemiş' : 'kaydedildi'}).
      </p>
    </>
  );
}

/* ------------------------------------------------------------------ Yaklaşım (Beam dışı) ------------------------------------------------------------------ */

export function TopicsEditor() {
  const [list, setList] = useJsonList<Pair>(topicsField.id, getSiteContent().academicInterests.map(pairOf));
  const edit = (i: number, k: 'tr' | 'en', v: string) => setList(list.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const move = (i: number, d: -1 | 1) => {
    const n = [...list];
    [n[i], n[i + d]] = [n[i + d], n[i]];
    setList(n);
  };
  return (
    <ListEditor
      label="İlgi duyulan konular (Yaklaşım sol sütunu)"
      min={1}
      max={topicsField.count}
      count={list.length}
      onAdd={() => setList([...list, { tr: '', en: '' }])}
      addLabel="Konu ekle"
    >
      {list.map((p, i) => (
        <RecordRow
          key={i}
          index={i}
          itemLabel="Konu"
          onUp={i > 0 ? () => move(i, -1) : undefined}
          onDown={i < list.length - 1 ? () => move(i, 1) : undefined}
          onRemove={list.length > 1 ? () => setList(list.filter((_, j) => j !== i)) : undefined}
        >
          <BilingualField
            name={`yaklasim.topic.${i}`}
            label={`Konu ${i + 1}`}
            tr={p.tr}
            en={p.en}
            max={topicsField.max}
            onTr={(x) => edit(i, 'tr', x)}
            onEn={(x) => edit(i, 'en', x)}
          />
        </RecordRow>
      ))}
    </ListEditor>
  );
}

/* ------------------------------------------------------------------ Çalışmalar ------------------------------------------------------------------ */

const WORK_KEYS = [
  'workHeading',
  'workProjects',
  'workNotes',
  'workEmptyProjects',
  'workEmptyProjectsText',
  'workEmptyNotes',
  'workAllNotes',
  'workToProfile',
  'workAllProjects',
  'workDrawnBy',
  'workStatus',
  'workStatusValue',
  'workRev',
] as const satisfies readonly CopyKey[];

export function WorkEditor() {
  const { state, setValue, snapshot, derived } = useAdminContent();
  // The same records the preview shows: public-rule projects of the mock state (loaded samples included).
  const projects = snapshot.publicProjects;
  const selectId = useId();
  const showProjects = flag(state.values[workViewFields.showProjects], true);
  const showNotes = flag(state.values[workViewFields.showNotes], true);
  const featured = state.values[workViewFields.featured] ?? '';
  const known = projects.some((p) => p.id === featured);
  const owner = derived.ownerName;
  return (
    <>
      <CopyStatus keys={WORK_KEYS} />
      <div className="a-field">
        <p className="a-label">Görünürlük</p>
        <Segmented
          label="Projeler bloğu"
          value={showProjects ? '1' : '0'}
          options={onOff}
          onChange={(v) => setValue(workViewFields.showProjects, v)}
        />
        <p className="a-help">
          Projeler bloğu: {showProjects ? 'görünür' : 'gizli'}. Gizliyken ne öne çıkan proje ne de boş durum kartı
          gösterilir.
        </p>
        <Segmented
          label="Notlar bloğu"
          value={showNotes ? '1' : '0'}
          options={onOff}
          onChange={(v) => setValue(workViewFields.showNotes, v)}
        />
        <p className="a-help">
          Notlar bloğu: {showNotes ? 'görünür' : 'gizli'}. Antet (Çizen, Durum, Rev.) her durumda kalır.
        </p>
      </div>

      <Field
        meta={{
          label: 'Öne çıkan proje',
          helper:
            'Yalnızca yayımlanmış ve onaylanmış projeler listelenir. Taslak ve onaysız kayıtlar burada ve önizlemede görünmez.',
        }}
        id={selectId}
      >
        {({ id, describedBy }) => (
          <select
            id={id}
            className="a-input"
            aria-describedby={describedBy}
            disabled={projects.length === 0}
            value={known ? featured : ''}
            onChange={(e) => setValue(workViewFields.featured, e.target.value)}
          >
            <option value="">Otomatik (işaretli ya da en yeni)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title.tr}
                {p.title.en !== p.title.tr ? ` · ${p.title.en}` : ''}
              </option>
            ))}
          </select>
        )}
      </Field>
      {projects.length === 0 && (
        <EmptyState title="Yayımlanmış ve onaylı proje yok." mark="Boş durum korunur">
          <p>
            Ana sayfada Çalışmalar bölümü tasarlanmış boş durumu gösterir. İlk onaylı proje eklendiğinde buradan öne
            çıkarılabilir.
          </p>
        </EmptyState>
      )}

      <CopyGroup keys={WORK_KEYS} />
      <Disclosure label="Türetilmiş değerler (salt okunur)" meta={<span className="a-sfx">kaynak başka yerde</span>}>
        <dl className="a-readouts">
          <Readout derived label="Antet: Çizen değeri" value={owner} />
          <Readout derived label="Antet: Revizyon değeri" value="—" />
          <Readout derived label="Yayımlanmış proje sayısı" value={projects.length} />
        </dl>
      </Disclosure>
    </>
  );
}

/* ------------------------------------------------------------------ Yönelim ------------------------------------------------------------------ */

const DIRECTION_KEYS = ['directionHeading', 'directionOpenness'] as const satisfies readonly CopyKey[];
export function DirectionEditor() {
  const c = useAdminContent().derived;
  const theta = Math.round(resultant(c.forceRecords).angleDeg);
  return (
    <>
      <CopyStatus keys={DIRECTION_KEYS} />
      <CopyGroup keys={DIRECTION_KEYS} />
      <Disclosure label="Türetilmiş değerler (salt okunur)" meta={<span className="a-sfx">hesaplanır</span>}>
        <dl className="a-readouts">
          <Readout derived label="Bileşke açısı θR" value={num(theta, 'tr', 0)} unit="°" />
        </dl>
        <p className="a-help">
          Bölümdeki bileşke oku, Kuvvetler kayıtlarından hesaplanır. Erişilebilirlik metni Hero bölümündeki “Bileşke
          vektörü” alanıdır.
        </p>
      </Disclosure>
    </>
  );
}

/* ------------------------------------------------------------------ İletişim ------------------------------------------------------------------ */

const CONTACT_KEYS = [
  'contactHeading',
  'contactLead',
  'contactLinkedin',
  'contactAlso',
  'contactCopy',
  'contactCopied',
  'contactCopyFailed',
  'contactCopyLabel',
  'contactExternal',
] as const satisfies readonly CopyKey[];

export function ContactEditor() {
  const { state, setValue } = useAdminContent();
  const c = getSiteContent();
  const v = (id: string, fb: string) => state.values[id] ?? fb;
  const email = v(contactFields.email, c.contact.email);
  return (
    <>
      <CopyStatus keys={CONTACT_KEYS} />
      <TextField
        name={contactFields.email}
        value={email}
        onChange={(x) => setValue(contactFields.email, x)}
        meta={{
          label: 'E-posta',
          required: true,
          helper:
            'Bağlantı, Kopyala düğmesi, mobil menü ve alt bilgi aynı adresi kullanır. Önizlemede gönderim yapılmaz.',
          counter: { value: email.length, max: 80 },
          error: checkEmail(email),
        }}
      />

      {c.platforms.map((p) => {
        const url = v(platformFieldId(p.id, 'url'), p.url);
        const handle = v(platformFieldId(p.id, 'handle'), p.handle ?? '');
        const showContact = flag(state.values[platformFieldId(p.id, 'showContact')], p.show.contact);
        const showFooter = flag(state.values[platformFieldId(p.id, 'showFooter')], p.show.footer);
        return (
          <Disclosure
            key={p.id}
            label={p.name}
            defaultOpen={p.id === 'linkedin'}
            meta={
              <span className="a-sfx">
                {p.id === 'linkedin'
                  ? 'ana bağlantı'
                  : `iletişim ${showContact ? 'açık' : 'gizli'} · alt bilgi ${showFooter ? 'açık' : 'gizli'}`}
              </span>
            }
          >
            <TextField
              name={platformFieldId(p.id, 'url')}
              value={url}
              onChange={(x) => setValue(platformFieldId(p.id, 'url'), x)}
              meta={{
                label: `${p.name} bağlantısı`,
                helper: 'https:// ile başlamalı ve platformun kendi alan adına ait olmalı.',
                error: checkPlatformUrl(p.id, url),
              }}
            />
            {p.handle !== undefined && (
              <TextField
                name={platformFieldId(p.id, 'handle')}
                value={handle}
                onChange={(x) => setValue(platformFieldId(p.id, 'handle'), x)}
                meta={{
                  label: `${p.name} kullanıcı adı`,
                  helper: '@ ile başlar; bağlantının yanında görünür.',
                  error: checkHandle(handle),
                }}
              />
            )}
            {p.id === 'linkedin' ? (
              <p className="a-help">LinkedIn ana çağrıdır; iletişim bölümünde ve alt bilgide her zaman görünür.</p>
            ) : (
              <>
                <Segmented
                  label={`${p.name}: İletişim bölümünde`}
                  title="İletişim bölümünde"
                  value={showContact ? '1' : '0'}
                  options={onOff}
                  onChange={(x) => setValue(platformFieldId(p.id, 'showContact'), x)}
                />
                <Segmented
                  label={`${p.name}: Alt bilgide`}
                  title="Alt bilgide"
                  value={showFooter ? '1' : '0'}
                  options={onOff}
                  onChange={(x) => setValue(platformFieldId(p.id, 'showFooter'), x)}
                />
                <p className="a-help">Kişisel hesaplar: Sinem onayına bağlı.</p>
              </>
            )}
          </Disclosure>
        );
      })}
      <CopyGroup keys={CONTACT_KEYS} />
    </>
  );
}

/* ------------------------------------------------------------------ Üst bilgi ve Alt bilgi ------------------------------------------------------------------ */

const HEADER_KEYS = [
  'navProfile',
  'navProjects',
  'navNotes',
  'navContact',
  'navMenu',
  'navClose',
  'navLanguage',
  'navLabel',
  'secTop',
  'secProfile',
  'secForces',
  'secWorkshop',
  'secApproach',
  'secWork',
  'secDirection',
  'secContact',
] as const satisfies readonly CopyKey[];
const FOOTER_KEYS = [
  'footerSentence',
  'footerDrawnBy',
  'footerSheet',
  'footerLanguage',
  'footerContact',
  'footerLinks',
  'footerRevision',
] as const satisfies readonly CopyKey[];

export function GlobalEditor() {
  const c = useAdminContent().derived;
  return (
    <>
      <h3 className="a-label">Üst bilgi</h3>
      <CopyStatus keys={HEADER_KEYS} />
      <CopyGroup keys={['navProfile', 'navProjects', 'navNotes', 'navContact', 'navMenu', 'navClose']} />
      <Disclosure label="Okunan bölüm adları ve erişilebilirlik" meta={<span className="a-sfx">10 metin çifti</span>}>
        <CopyGroup
          keys={[
            'secTop',
            'secProfile',
            'secForces',
            'secWorkshop',
            'secApproach',
            'secWork',
            'secDirection',
            'secContact',
            'navLabel',
            'navLanguage',
          ]}
        />
      </Disclosure>
      <p className="a-help">
        Üst bilgideki ad, Hero’daki Ad ve Soyad alanlarından; e-posta İletişim bölümünden gelir. Dil adları (Türkçe,
        English) sabittir.
      </p>

      <h3 className="a-label">Alt bilgi</h3>
      <CopyStatus keys={FOOTER_KEYS} />
      <CopyGroup keys={['footerSentence']} />
      <Disclosure label="Hücre etiketleri" meta={<span className="a-sfx">6 metin çifti</span>}>
        <CopyGroup
          keys={['footerDrawnBy', 'footerSheet', 'footerLanguage', 'footerContact', 'footerLinks', 'footerRevision']}
        />
      </Disclosure>
      <Disclosure label="Türetilmiş değerler (salt okunur)" meta={<span className="a-sfx">kaynak başka yerde</span>}>
        <dl className="a-readouts">
          <Readout derived label="Çizen" value={c.ownerName} />
          <Readout derived label="Son revizyon" value={fullDate(c.lastRevision, 'tr')} />
          <Readout derived label="Telif satırı" value={`© ${c.lastRevision.slice(0, 4)} ${c.ownerName}`} />
        </dl>
        <p className="a-help">
          Revizyon tarihi, simüle edilen Yayın eylemiyle belirlenir; telif yılı ondan türetilir. Alt bilgideki
          bağlantılar ve e-posta İletişim bölümündeki kayıtlardan gelir.
        </p>
      </Disclosure>
    </>
  );
}
