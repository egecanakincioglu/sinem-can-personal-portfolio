'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { dict } from '@/content/dictionary';
import type {
  Discipline,
  ImageMedia,
  ProjectContext,
  ProjectKind,
  ProjectRecord,
  ProjectStatus,
  PublicProject,
} from '@/content/projects/types';
import type { Copy, Period } from '@/content/types';
import { posterCandidates, type GlbEntry } from '@/lib/glb';
import type { MediaAsset } from '@/lib/media';
import { foldSlug, heroOptions, projectCompleteness, projectIssues } from '@/lib/project-edit';
import { titleBlockCells } from '@/lib/project-view';
import { toPublicProject } from '@/lib/projects';
import { OriginalsList } from '../../cad-glb/OriginalsList';
import { Preview3DPanel } from '../../cad-glb/Preview3DPanel';
import { BilingualField, ListEditor, RecordRow, Segmented, TextField } from '../../../ui/controls';
import { ConfirmDialog, ErrorState, Glyph, Readout, StatusChip } from '../../../ui/feedback';
import { MediaPicker } from '../../../ui/MediaPicker';
import { PageHeader, Section } from '../../../ui/PageHeader';
import { revLetter, useAdmin, useAdminContent, type ProjectPatch } from '../../../ui/store';
import { ProjectBody } from './ProjectBody';
import { CopyList, MAX_ITEMS, OptionalCopy, bare, emptyCopy, moved } from './parts';

const MAX_TOOLS = 12;
const MAX_RELATED = 2;

const kinds = Object.keys(dict.projects.kinds) as ProjectKind[];
const contexts = Object.keys(dict.projects.contexts) as ProjectContext[];
const statuses = Object.keys(dict.projects.statuses) as ProjectStatus[];
const disciplines = Object.keys(dict.projects.disciplines) as Discipline[];

type Figure = NonNullable<ProjectRecord['figures']>[number];

const toMedia = (a: MediaAsset): ImageMedia => ({
  id: a.id,
  kind: a.kind,
  src: a.src,
  width: a.width,
  height: a.height,
  alt: a.alt,
  ...(a.caption ? { caption: a.caption } : {}),
  ...(a.focal ? { focalX: a.focal.x, focalY: a.focal.y } : {}),
});

/** Radio group with per-option disabled reasons (Segmented has no disabled state). */
function Choice<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T | undefined;
  options: { value: T; label: string; disabled?: boolean; reason?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="a-field" name={name}>
      <legend className="a-label">{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className="a-check">
          <input
            type="radio"
            name={name}
            checked={value === o.value}
            disabled={o.disabled}
            onChange={() => onChange(o.value)}
          />
          {o.label}
          {o.disabled && o.reason && <span className="a-sfx"> · {o.reason}</span>}
        </label>
      ))}
    </fieldset>
  );
}

/** The title block as the preview language reads it. Reads the language itself, so only this re-renders on a switch. */
function AntetCells({ pub }: { pub: PublicProject }) {
  const { state } = useAdmin();
  const cells = titleBlockCells(pub, state.previewLang, dict);
  return (
    <div className="a-field">
      <p className="a-label">Antet önizlemesi · {state.previewLang.toUpperCase()}</p>
      <dl className="a-readouts" aria-label="Antet hücreleri">
        {cells.map(([label, value]) => (
          <Readout key={label} derived label={label} value={value} />
        ))}
      </dl>
    </div>
  );
}

function SelectField<T extends string>({
  id,
  label,
  value,
  options,
  empty,
  onChange,
}: {
  id: string;
  label: string;
  value: T | undefined;
  options: { value: T; label: string }[];
  empty?: string;
  onChange: (v: T | undefined) => void;
}) {
  return (
    <div className="a-field">
      <div className="a-field-head">
        <label htmlFor={id} className="a-label">
          {label}
        </label>
      </div>
      <select
        id={id}
        className="a-input"
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as T | undefined)}
      >
        {empty && <option value="">{empty}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function MediaFields<M extends { alt: Copy; caption?: Copy }>({
  name,
  media,
  errors,
  onChange,
}: {
  name: string;
  media: M;
  errors?: { tr?: string; en?: string };
  onChange: (next: M) => void;
}) {
  return (
    <>
      <BilingualField
        name={`${name}.alt`}
        label="Açıklama (alt)"
        errors={errors}
        tr={media.alt.tr}
        en={media.alt.en}
        onTr={(v) => onChange({ ...media, alt: { ...media.alt, tr: v } })}
        onEn={(v) => onChange({ ...media, alt: { ...media.alt, en: v } })}
      />
      <OptionalCopy
        name={`${name}.caption`}
        label="Alt yazı"
        value={media.caption}
        onChange={(c) => onChange({ ...media, caption: c })}
      />
    </>
  );
}

const periodShape = (p: Period | undefined): string | undefined => {
  if (!p) return undefined;
  const ok = p.precision === 'year' ? /^\d{4}$/ : /^\d{4}-\d{2}$/;
  const bad = !ok.test(p.start) || (p.end !== undefined && !ok.test(p.end));
  return bad ? 'Ay duyarlığı için YYYY-AA, yıl duyarlığı için YYYY biçimi gerekir.' : undefined;
};

type Props = { id: string; assets: MediaAsset[]; portraitId: string; library: GlbEntry[] };

export function ProjectEditor(props: Props) {
  const { state, hydrated } = useAdminContent();
  const project = state.projects.find((p) => p.id === props.id);
  if (!hydrated) return null;
  if (!project) {
    return (
      <>
        <PageHeader kicker="Projeler" title="Proje düzenle" />
        <Section id="kayit" title="Kayıt">
          <ErrorState title={`“${props.id}” kaydı bulunamadı.`}>
            <p>
              Kayıt bu tarayıcı oturumunda yok. <Link href="/admin/projeler">Proje listesine dönün</Link>.
            </p>
          </ErrorState>
        </Section>
      </>
    );
  }
  return <Editor project={project} {...props} />;
}

function Editor({ project, assets, portraitId, library }: Props & { project: ProjectRecord }) {
  const { state, patchProject, setFeatured, removeProject, probeProject, toast } = useAdminContent();
  const router = useRouter();
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [toolDraft, setToolDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = (p: ProjectPatch) => patchProject(project.id, p);
  const pid = project.id;

  // Leaving the screen ends any 3D preview that was being tried.
  const clear = useRef(probeProject);
  useEffect(() => {
    clear.current = probeProject;
  });
  useEffect(() => () => clear.current(null), []);

  const pickable = useMemo(() => posterCandidates(assets, portraitId), [assets, portraitId]);
  const assetIds = useMemo(() => new Set(assets.flatMap((a) => [a.id, `${pid}/${a.id}`])), [assets, pid]);
  const issues = useMemo(
    () => projectIssues(project, { records: state.projects, assetIds }),
    [project, state.projects, assetIds],
  );
  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.length - errors.length;

  const touch = (k: string) => setTouched((prev) => (prev.has(k) ? prev : new Set(prev).add(k)));
  const on = (k: string, node: ReactNode) => <div onBlur={() => touch(k)}>{node}</div>;
  // Inline on blur, then live: a message appears once its field has been left.
  const err = (field: string, lang?: 'tr' | 'en') =>
    touched.has(field)
      ? bare(issues.find((i) => i.field === field && i.lang === lang && i.severity === 'error')?.message)
      : undefined;
  const pairErrors = (field: string) => ({ tr: err(field, 'tr'), en: err(field, 'en') });

  const assetOf = (m: { id: string } | undefined) =>
    m ? assets.find((a) => a.id === m.id || a.id === `${pid}/${m.id}`)?.id : undefined;

  const savedVisible = state.savedProjects.find((p) => p.id === pid);
  const slugChanged =
    savedVisible?.visibility === 'published' &&
    (savedVisible.slug.tr !== project.slug.tr || savedVisible.slug.en !== project.slug.en);

  const pub = toPublicProject(project);
  const period = project.period;
  const setPeriod = (next: Partial<Period>) => {
    const m: Period = { start: '', precision: 'month', ...period, ...next };
    if (!m.start.trim()) return patch({ period: undefined });
    const { end, expected, ...rest } = m;
    patch({ period: { ...rest, ...(end?.trim() ? { end } : {}), ...(expected ? { expected: true } : {}) } });
  };
  const hero = heroOptions(project);
  const tools = project.tools ?? [];
  const figures: Figure[] = project.figures ?? [];
  const related = project.relatedIds ?? [];
  const revisions = project.revisions ?? [];
  const others = state.projects.filter((p) => p.id !== pid);
  const published = project.visibility === 'published';

  const addTool = () => {
    const t = toolDraft.trim();
    if (!t || tools.length >= MAX_TOOLS || tools.includes(t)) return;
    patch({ tools: [...tools, t] });
    setToolDraft('');
  };
  const toggleFeatured = () => {
    if (project.featured) return setFeatured(null);
    const other = state.projects.find((p) => p.featured && p.id !== pid);
    setFeatured(pid);
    if (other) toast(`“${other.title.tr || other.id}” artık öne çıkan değil.`);
  };
  const title = project.title.tr || project.title.en || 'Adsız proje';

  return (
    <>
      <PageHeader
        kicker="Pafta 03"
        title={title}
        lede="Proje kaydını bölümler halinde düzenleyin; değişiklikler Kaydet ile oturuma yazılır."
        aside={
          <div>
            <p className="a-rec-tools">
              <StatusChip kind={published ? 'live' : 'draft'} />
              {published && project.approved === true && <StatusChip kind="approved" />}
              {project.fixture && <StatusChip kind="sample" />}
            </p>
            <p className="a-help" aria-live="polite">
              {projectCompleteness(project)}
            </p>
            <p className="a-help">Taslak önizlemesi sonraki adımda.</p>
          </div>
        }
      />

      <Section id="kimlik" title="Kimlik">
        <dl className="a-readouts">
          <Readout derived label="Kayıt kimliği" value={pid} />
        </dl>
        {on(
          'title',
          <BilingualField
            name="kimlik.title"
            label="Başlık"
            errors={pairErrors('title')}
            tr={project.title.tr}
            en={project.title.en}
            onTr={(v) => patch({ title: { ...project.title, tr: v } })}
            onEn={(v) => patch({ title: { ...project.title, en: v } })}
          />,
        )}
        <OptionalCopy
          name="kimlik.subtitle"
          label="Alt başlık"
          value={project.subtitle}
          onChange={(c) => patch({ subtitle: c })}
        />
        <SelectField
          id="proje-tur"
          label="Tür"
          value={project.kind}
          options={kinds.map((k) => ({ value: k, label: dict.projects.kinds[k].tr }))}
          onChange={(k) => k && patch({ kind: k })}
        />
        {on(
          'slug',
          <BilingualField
            name="kimlik.slug"
            label="Adres parçası"
            helper="Yalnızca küçük harf, rakam ve tire; her dilde ayrı ve benzersiz."
            errors={pairErrors('slug')}
            tr={project.slug.tr}
            en={project.slug.en}
            onTr={(v) => patch({ slug: { ...project.slug, tr: v } })}
            onEn={(v) => patch({ slug: { ...project.slug, en: v } })}
          />,
        )}
        <div className="a-proj-actions">
          <button
            type="button"
            className="a-btn"
            onClick={() =>
              patch({
                slug: {
                  tr: foldSlug(project.title.tr) || project.slug.tr,
                  en: foldSlug(project.title.en) || project.slug.en,
                },
              })
            }
          >
            Adresi başlıktan öner
          </button>
        </div>
        {slugChanged && <p className="a-warn">Uyarı: Eski adres 404 verir; yönlendirme yoktur.</p>}
      </Section>

      <Section id="antet" title="Antet" note="Antet önizlemesi kayıttan hesaplanır; boş hücre gösterilmez.">
        {on(
          'disciplines',
          <fieldset className="a-field">
            <legend className="a-label">Disiplinler · en az 1</legend>
            {disciplines.map((d) => (
              <label key={d} className="a-check">
                <input
                  type="checkbox"
                  checked={project.disciplines.includes(d)}
                  onChange={(e) =>
                    patch({
                      disciplines: e.target.checked
                        ? [...project.disciplines, d]
                        : project.disciplines.filter((x) => x !== d),
                    })
                  }
                />
                {dict.projects.disciplines[d].tr}
              </label>
            ))}
            {err('disciplines') && (
              <p className="a-err">
                <Glyph name="bang" /> Hata: {err('disciplines')}
              </p>
            )}
          </fieldset>,
        )}
        <Segmented
          label="Durum"
          value={project.status}
          options={statuses.map((s) => ({ value: s, label: dict.projects.statuses[s].tr }))}
          onChange={(s) => patch({ status: s })}
        />
        <SelectField
          id="proje-baglam"
          label="Bağlam"
          value={project.context}
          empty="Seçilmedi"
          options={contexts.map((c) => ({ value: c, label: dict.projects.contexts[c].tr }))}
          onChange={(c) => patch({ context: c })}
        />
        {on(
          'period',
          <div className="a-cad-form">
            <TextField
              name="antet.period.start"
              meta={{
                label: 'Dönem başlangıcı',
                helper: 'YYYY-AA ya da YYYY. Boş bırakılırsa dönem kaldırılır.',
                error: touched.has('period') ? periodShape(period) : undefined,
              }}
              value={period?.start ?? ''}
              onChange={(v) => setPeriod({ start: v })}
            />
            <TextField
              name="antet.period.end"
              meta={{ label: 'Dönem bitişi', error: err('period') }}
              value={period?.end ?? ''}
              onChange={(v) => setPeriod({ end: v })}
            />
            <Segmented
              label="Dönem duyarlığı"
              value={period?.precision ?? 'month'}
              options={[
                { value: 'month', label: 'Ay' },
                { value: 'year', label: 'Yıl' },
              ]}
              onChange={(v) => setPeriod({ precision: v })}
            />
            <label className="a-check">
              <input
                type="checkbox"
                checked={period?.expected === true}
                onChange={(e) => setPeriod({ expected: e.target.checked })}
              />
              Beklenen bitiş
            </label>
          </div>,
        )}
        <div className="a-field">
          <p className="a-label">
            Araçlar{' '}
            <span className="a-count a-num">
              {tools.length} / {MAX_TOOLS}
            </span>
          </p>
          {tools.length > 0 && (
            <ul className="a-proj-actions" aria-label="Araçlar">
              {tools.map((t) => (
                <li key={t} className="a-chip">
                  {t}{' '}
                  <button
                    type="button"
                    className="a-link"
                    aria-label={`${t} aracını kaldır`}
                    onClick={() => {
                      const next = tools.filter((x) => x !== t);
                      patch({ tools: next.length ? next : undefined });
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <TextField
            name="antet.tool"
            meta={{ label: 'Araç adı', helper: 'Çevrilmez; Enter ile ya da Ekle ile eklenir.' }}
            value={toolDraft}
            onChange={setToolDraft}
          />
          <button type="button" className="a-btn" disabled={tools.length >= MAX_TOOLS} onClick={addTool}>
            <Glyph name="plus" /> Araç ekle
          </button>
        </div>
        <CopyList
          label="Malzemeler"
          name="antet.materials"
          itemLabel="Malzeme"
          items={project.materials ?? []}
          onChange={(next) => patch({ materials: next.length ? next : undefined })}
        />
        <AntetCells pub={pub} />
      </Section>

      <Section id="gorsel" title="Görsel">
        <Choice
          legend="Üst kompozisyon"
          name="gorsel-hero"
          value={project.hero}
          options={hero}
          onChange={(v) => patch({ hero: v })}
        />
        <p className="a-help">Seçilmezse sayfada Metin kompozisyonu kullanılır.</p>
        <MediaPicker
          label="Kapak görseli"
          assets={pickable}
          selectedId={assetOf(project.cover)}
          onPick={(a) => patch({ cover: toMedia(a) })}
          onClear={() =>
            patch({
              cover: undefined,
              ...(project.hero === 'render' || project.hero === 'figure' ? { hero: undefined } : {}),
            })
          }
        />
        {project.cover &&
          on(
            'cover',
            <MediaFields
              name="gorsel.cover"
              media={project.cover}
              errors={pairErrors('cover')}
              onChange={(next) => patch({ cover: next })}
            />,
          )}
      </Section>

      <Section id="govde" title="Gövde">
        <ProjectBody project={project} issues={issues} />
      </Section>

      <Section id="sekiller" title="Şekiller" note="Şekil numaraları sıradan türetilir.">
        <div className="a-list">
          <div className="a-list-head">
            <span className="a-label">Şekiller</span>
            <span className="a-count a-num" role="status">
              {figures.length} / {MAX_ITEMS}
            </span>
          </div>
          <ol className="a-recs">
            {figures.map((f, i) => (
              <RecordRow
                key={i}
                index={i}
                meta={f.id}
                itemLabel="Şekil"
                onUp={i > 0 ? () => patch({ figures: moved(figures, i, -1) }) : undefined}
                onDown={i < figures.length - 1 ? () => patch({ figures: moved(figures, i, 1) }) : undefined}
                onRemove={() => {
                  const next = figures.filter((_, j) => j !== i);
                  patch({ figures: next.length ? next : undefined });
                }}
              >
                {on(
                  `figures.${i}`,
                  <MediaFields
                    name={`sekiller.${i}`}
                    media={f}
                    errors={pairErrors(`figures.${i}`)}
                    onChange={(next) => patch({ figures: figures.map((x, j) => (i === j ? next : x)) })}
                  />,
                )}
              </RecordRow>
            ))}
          </ol>
        </div>
        <MediaPicker
          label="Şekil ekle"
          assets={pickable}
          onPick={(a) => patch({ figures: [...figures, toMedia(a)] })}
        />
      </Section>

      <Section id="model" title="3B ve CAD">
        <Preview3DPanel project={project} posters={pickable} library={library} />
        <OriginalsList project={project} />
      </Section>

      <Section id="iliskiler" title="İlişkiler" note={`En fazla ${MAX_RELATED} gösterilir.`}>
        {others.length === 0 ? (
          <p className="a-help">Başka proje yok.</p>
        ) : (
          <fieldset className="a-field">
            <legend className="a-label">İlgili projeler</legend>
            {others.map((o) => {
              const checked = related.includes(o.id);
              return (
                <label key={o.id} className="a-check">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && related.length >= MAX_RELATED}
                    onChange={(e) => {
                      const next = e.target.checked ? [...related, o.id] : related.filter((x) => x !== o.id);
                      patch({ relatedIds: next.length ? next : undefined });
                    }}
                  />
                  {o.title.tr || o.title.en || o.id}
                </label>
              );
            })}
          </fieldset>
        )}
      </Section>

      <Section id="revizyonlar" title="Revizyonlar">
        <ListEditor
          label="Revizyonlar"
          min={0}
          max={MAX_ITEMS}
          count={revisions.length}
          addLabel="Revizyon ekle"
          onAdd={() => patch({ revisions: [...revisions, { rev: revLetter(revisions.length), note: emptyCopy() }] })}
        >
          {revisions.map((r, i) => {
            const set = (next: Partial<typeof r>) =>
              patch({ revisions: revisions.map((x, j) => (i === j ? { ...x, ...next } : x)) });
            return (
              <RecordRow
                key={i}
                index={i}
                itemLabel="Revizyon"
                onUp={i > 0 ? () => patch({ revisions: moved(revisions, i, -1) }) : undefined}
                onDown={i < revisions.length - 1 ? () => patch({ revisions: moved(revisions, i, 1) }) : undefined}
                onRemove={() => {
                  const next = revisions.filter((_, j) => j !== i);
                  patch({ revisions: next.length ? next : undefined });
                }}
              >
                <TextField
                  name={`rev.${i}.rev`}
                  meta={{ label: 'Revizyon harfi' }}
                  value={r.rev}
                  onChange={(v) => set({ rev: v })}
                />
                <TextField
                  name={`rev.${i}.date`}
                  meta={{ label: 'Tarih', helper: 'İsteğe bağlı; YYYY-AA-GG.' }}
                  value={r.date ?? ''}
                  onChange={(v) => set({ date: v || undefined })}
                />
                <BilingualField
                  name={`rev.${i}.note`}
                  label="Not"
                  tr={r.note.tr}
                  en={r.note.en}
                  onTr={(v) => set({ note: { ...r.note, tr: v } })}
                  onEn={(v) => set({ note: { ...r.note, en: v } })}
                />
                <OptionalCopy
                  name={`rev.${i}.reasoning`}
                  label="Gerekçe"
                  value={r.reasoning}
                  onChange={(c) => set({ reasoning: c })}
                />
              </RecordRow>
            );
          })}
        </ListEditor>
      </Section>

      <Section
        id="yayin"
        title="Yayın"
        note="Genel sitede görünmek için kayıt Yayında olmalı ve Sinem onaylamış olmalı. İki dil de tamam olmalıdır."
      >
        <Choice
          legend="Durum"
          name="yayin-visibility"
          value={project.visibility}
          options={[
            { value: 'draft', label: 'Taslak' },
            {
              value: 'published',
              label: 'Yayında (sim.)',
              disabled: !published && errors.length > 0,
              reason: 'önce hataları giderin',
            },
          ]}
          onChange={(v) => patch({ visibility: v, ...(v === 'published' ? { approved: false } : {}) })}
        />
        <label className="a-check">
          <input
            type="checkbox"
            checked={project.visibility === 'published' && project.approved === true}
            disabled={!published}
            onChange={(e) => patch({ approved: e.target.checked })}
          />
          Sinem onayladı
        </label>
        {!published && <p className="a-help">Onay yalnızca Yayında (sim.) kayıtlar için işaretlenir.</p>}
        <label className="a-check">
          <input type="checkbox" checked={project.featured === true} onChange={toggleFeatured} />
          Öne çıkan
        </label>
        <p className="a-help">Yalnızca bir proje öne çıkan olabilir; diğerlerinden kaldırılır.</p>
        <div className="a-field">
          <p className="a-label">Kontrol listesi</p>
          <p className="a-help" aria-live="polite">
            {errors.length} hata · {warnings} uyarı · {projectCompleteness(project)}
          </p>
          {issues.length === 0 ? (
            <p className="a-help">Engel yok.</p>
          ) : (
            <ul className="a-checklist" aria-label="Yayın kontrolleri">
              {issues.map((i, n) => (
                <li key={n}>
                  <Glyph name="bang" />
                  <a href={`#bolum-${i.section}`}>
                    {i.message}
                    {i.lang ? ` (${i.lang.toUpperCase()})` : ''}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="a-proj-actions">
          <button type="button" className="a-btn" onClick={() => setConfirmDelete(true)}>
            Projeyi sil
          </button>
        </div>
        <ConfirmDialog
          open={confirmDelete}
          title="Proje silinsin mi?"
          confirmLabel="Projeyi sil"
          onClose={() => setConfirmDelete(false)}
          onConfirm={() => {
            removeProject(pid);
            router.push('/admin/projeler');
          }}
        >
          <p>“{title}” bu oturumdan kaldırılır. Kaydet’e basılmadıysa Vazgeç ile geri alınabilir.</p>
        </ConfirmDialog>
      </Section>
    </>
  );
}
