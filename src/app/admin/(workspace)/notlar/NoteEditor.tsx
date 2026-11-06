'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { locales } from '@/content/types';
import { buildCtx } from '@/lib/inline';
import type { MediaAsset } from '@/lib/media';
import { unpairBlocks } from '@/lib/note-blocks';
import { noteIssues, noteLangStatus, noteListRow, type MockNote } from '@/lib/note-record';
import { BilingualField, ListEditor, RecordRow, Segmented, TextField } from '../../ui/controls';
import { ConfirmDialog, ErrorState, Readout, StatusChip } from '../../ui/feedback';
import { PageHeader, Section } from '../../ui/PageHeader';
import { useAdmin } from '../../ui/store';
import { BlockList, IssueList } from './BlockEditor';
import { PairText, type Ctxs } from './PairText';

type Pair = { tr: string; en: string };
const pair = (): Pair => ({ tr: '', en: '' });
const LANG_NAME = { tr: 'Türkçe', en: 'İngilizce' } as const;

const sections = [
  ['ustbilgi', 'Üstbilgi'],
  ['govde', 'Gövde'],
  ['dipnotlar', 'Dipnotlar'],
  ['kaynaklar', 'Kaynaklar'],
  ['revizyonlar', 'Revizyonlar'],
  ['yayin', 'Yayın'],
] as const;

function swap<T>(list: T[], i: number, by: -1 | 1): T[] {
  const next = [...list];
  [next[i], next[i + by]] = [next[i + by], next[i]];
  return next;
}

/** Editor of one note: header fields, ordered body blocks, footnotes, references, revisions and the publish state. */
export function NoteEditor({
  id,
  figureIds,
  assets,
}: {
  id: string;
  figureIds: readonly string[];
  assets: readonly MediaAsset[];
}) {
  const { state, hydrated, patchNote, setLang, setNoteFeatured, removeNote } = useAdmin();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const note = state.notes.find((n) => n.id === id);

  const ctxs = useMemo<Ctxs | null>(() => {
    if (!note) return null;
    const of = (l: 'tr' | 'en') =>
      buildCtx(
        { slug: note.slug[l], title: note.title[l], summary: note.summary[l], blocks: unpairBlocks(note.blocks, l) },
        l,
      );
    return { tr: of('tr'), en: of('en') };
  }, [note]);
  const issues = useMemo(
    () => (note ? noteIssues(note, { records: state.notes, figureIds, assetIds: assets.map((a) => a.src) }) : []),
    [note, state.notes, figureIds, assets],
  );

  if (!hydrated) return null;
  if (!note || !ctxs) {
    return (
      <>
        <PageHeader kicker="Pafta 04" title="Not düzenle" />
        <ErrorState title={`“${id}” kaydı bulunamadı.`}>
          <p>
            Not listesinden bir kayıt seçin.{' '}
            <Link className="a-link" href="/admin/notlar">
              Notlara dön
            </Link>
          </p>
        </ErrorState>
      </>
    );
  }

  const patch = (p: Partial<Omit<MockNote, 'id' | 'blocks'>>) => patchNote(note.id, p);
  const bi = (key: 'slug' | 'title' | 'subtitle' | 'summary' | 'category' | 'coverAlt', label: string, o = {}) => (
    <BilingualField
      name={`note-${key}`}
      label={label}
      tr={note[key].tr}
      en={note[key].en}
      onTr={(v) => patch({ [key]: { ...note[key], tr: v } })}
      onEn={(v) => patch({ [key]: { ...note[key], en: v } })}
      {...o}
    />
  );
  const row = note ? noteListRow(note, state.editLang) : null;
  const others = state.notes.filter((n) => n.id !== note.id);
  const related = note.relatedIds ?? [];
  const lastLive = locales.filter((l) => note.langs[l] === 'on').length <= 1;

  return (
    <>
      <PageHeader
        kicker="Pafta 04"
        title={note.title[state.editLang] || note.title.tr || note.id}
        lede="Not düzenle"
        aside={
          <div className="a-rec-tools">
            <StatusChip kind={note.status === 'published' ? 'live' : 'draft'} />
            {note.approved && <StatusChip kind="approved" />}
            {note.fixture && <StatusChip kind="sample" />}
          </div>
        }
      />
      <nav aria-label="Not bölümleri" className="a-note-index">
        <Link className="a-link" href="/admin/notlar">
          Notlar
        </Link>
        {sections.map(([sid, label]) => (
          <a key={sid} className="a-link" href={`#bolum-${sid}`}>
            {label}
          </a>
        ))}
      </nav>
      <p className="a-help">Taslak önizlemesi sonraki adımda.</p>

      <Section id="ustbilgi" title="Üstbilgi" note="Tarihler, durum, ilgili notlar ve iki dildeki üstbilgi alanları.">
        <dl className="a-readouts">
          <Readout label="Kimlik" value={note.id} />
          <Readout derived label="Okuma süresi" value={row?.minutes ?? 0} unit="dk" />
          {locales.map((l) => (
            <Readout key={l} derived label={`${l.toUpperCase()} durumu`} value={noteLangStatus(note, l)} />
          ))}
        </dl>
        <div className="a-field">
          <span className="a-label">Durum</span>
          <Segmented
            label="Durum"
            value={note.status}
            options={[
              { value: 'draft', label: 'Taslak' },
              { value: 'published', label: 'Yayında' },
            ]}
            onChange={(status) => patch({ status })}
          />
          <label className="a-check">
            <input type="checkbox" checked={note.approved} onChange={(e) => patch({ approved: e.target.checked })} />
            <span>Sinem onayladı</span>
          </label>
          <label className="a-check">
            <input
              type="checkbox"
              checked={note.featured === true}
              onChange={(e) => setNoteFeatured(note.id, e.target.checked)}
            />
            <span>Öne çıkan</span>
          </label>
        </div>
        <div className="a-field">
          <label className="a-label" htmlFor="note-published">
            Yayım tarihi
          </label>
          <input
            id="note-published"
            className="a-input"
            type="date"
            value={note.published}
            onChange={(e) => patch({ published: e.target.value })}
          />
        </div>
        <div className="a-field">
          <label className="a-label" htmlFor="note-updated">
            Güncelleme tarihi (isteğe bağlı)
          </label>
          <input
            id="note-updated"
            className="a-input"
            type="date"
            value={note.updated ?? ''}
            onChange={(e) => patch({ updated: e.target.value === '' ? undefined : e.target.value })}
          />
        </div>
        {others.length > 0 && (
          <fieldset className="a-field">
            <legend className="a-label">İlgili notlar (en çok 2 gösterilir)</legend>
            {others.map((o) => (
              <label key={o.id} className="a-check">
                <input
                  type="checkbox"
                  checked={related.includes(o.id)}
                  onChange={(e) =>
                    patch({
                      relatedIds: e.target.checked ? [...related, o.id] : related.filter((r) => r !== o.id),
                    })
                  }
                />
                <span>{o.title.tr || o.id}</span>
              </label>
            ))}
          </fieldset>
        )}
        {bi('slug', 'Adres parçası', {
          helper: 'Başlık kimlikleri iki dilde ortaktır; adres parçası dile göre değişir.',
        })}
        {bi('title', 'Başlık')}
        {bi('subtitle', 'Alt başlık', { optional: true })}
        {bi('summary', 'Özet', { multiline: true, max: 240 })}
        {bi('category', 'Konu', { optional: true, max: 40 })}
        {bi('coverAlt', 'Kapak alternatif metni', { optional: true })}
        <p className="a-help">Kapak görseli Medya ekranından seçilecek.</p>
        <ListEditor
          label="Etiketler"
          min={0}
          max={8}
          count={note.tags.length}
          onAdd={() => patch({ tags: [...note.tags, pair()] })}
          addLabel="Etiket ekle"
        >
          {note.tags.map((t, i) => (
            <RecordRow
              key={i}
              index={i}
              itemLabel="Etiket"
              onUp={i > 0 ? () => patch({ tags: swap(note.tags, i, -1) }) : undefined}
              onDown={i < note.tags.length - 1 ? () => patch({ tags: swap(note.tags, i, 1) }) : undefined}
              onRemove={() => patch({ tags: note.tags.filter((_, j) => j !== i) })}
            >
              <BilingualField
                name={`note-tag-${i}`}
                label={`Etiket ${i + 1}`}
                optional
                tr={t.tr}
                en={t.en}
                onTr={(v) => patch({ tags: note.tags.map((x, j) => (j === i ? { ...x, tr: v } : x)) })}
                onEn={(v) => patch({ tags: note.tags.map((x, j) => (j === i ? { ...x, en: v } : x)) })}
              />
            </RecordRow>
          ))}
        </ListEditor>
        <IssueList
          label="Üstbilgi denetimi"
          issues={issues.filter((x) => !/^(blocks|footnotes|references)/.test(x.field))}
        />
      </Section>

      <Section
        id="govde"
        title="Gövde"
        note="Bloklar iki dilde birlikte tutulur; sıra ve türler her iki dilde aynıdır."
      >
        <BlockList note={note} ctxs={ctxs} issues={issues} figureIds={figureIds} assets={assets} />
        <IssueList label="Gövde denetimi" issues={issues.filter((x) => x.field === 'blocks')} />
      </Section>

      <Section id="dipnotlar" title="Dipnotlar" note="Metinde [^kimlik] ile anılır. Kimlikler iki dilde ortaktır.">
        <ListEditor
          label="Dipnotlar"
          min={0}
          max={30}
          count={note.footnotes.length}
          onAdd={() => patch({ footnotes: [...note.footnotes, { id: '', text: pair() }] })}
          addLabel="Dipnot ekle"
        >
          {note.footnotes.map((f, i) => (
            <RecordRow
              key={i}
              index={i}
              itemLabel="Dipnot"
              onUp={i > 0 ? () => patch({ footnotes: swap(note.footnotes, i, -1) }) : undefined}
              onDown={
                i < note.footnotes.length - 1 ? () => patch({ footnotes: swap(note.footnotes, i, 1) }) : undefined
              }
              onRemove={() => patch({ footnotes: note.footnotes.filter((_, j) => j !== i) })}
            >
              <TextField
                name={`note-fn-${i}-id`}
                meta={{ label: 'Kimlik' }}
                value={f.id}
                onChange={(v) => patch({ footnotes: note.footnotes.map((x, j) => (j === i ? { ...x, id: v } : x)) })}
              />
              <PairText
                name={`note-fn-${i}`}
                label="Metin"
                value={f.text}
                onChange={(text) => patch({ footnotes: note.footnotes.map((x, j) => (j === i ? { ...x, text } : x)) })}
                ctxs={ctxs}
                multiline
              />
              <IssueList label="Dipnot denetimi" issues={issues.filter((x) => x.field.startsWith(`footnotes[${i}]`))} />
            </RecordRow>
          ))}
        </ListEditor>
      </Section>

      <Section id="kaynaklar" title="Kaynaklar" note="Metinde [@kimlik] ile anılır. Bağlantı https ile başlamalı.">
        <ListEditor
          label="Kaynaklar"
          min={0}
          max={30}
          count={note.references.length}
          onAdd={() => patch({ references: [...note.references, { id: '', text: pair() }] })}
          addLabel="Kaynak ekle"
        >
          {note.references.map((r, i) => {
            const set = (change: Partial<(typeof note.references)[number]>) =>
              patch({ references: note.references.map((x, j) => (j === i ? { ...x, ...change } : x)) });
            return (
              <RecordRow
                key={i}
                index={i}
                itemLabel="Kaynak"
                onUp={i > 0 ? () => patch({ references: swap(note.references, i, -1) }) : undefined}
                onDown={
                  i < note.references.length - 1 ? () => patch({ references: swap(note.references, i, 1) }) : undefined
                }
                onRemove={() => patch({ references: note.references.filter((_, j) => j !== i) })}
              >
                <TextField
                  name={`note-ref-${i}-id`}
                  meta={{ label: 'Kimlik' }}
                  value={r.id}
                  onChange={(v) => set({ id: v })}
                />
                <PairText
                  name={`note-ref-${i}`}
                  label="Metin"
                  value={r.text}
                  onChange={(text) => set({ text })}
                  ctxs={ctxs}
                  multiline
                />
                <TextField
                  name={`note-ref-${i}-url`}
                  meta={{ label: 'Bağlantı (isteğe bağlı)' }}
                  value={r.url ?? ''}
                  onChange={(v) => set({ url: v === '' ? undefined : v })}
                />
                <IssueList
                  label="Kaynak denetimi"
                  issues={issues.filter((x) => x.field.startsWith(`references[${i}]`))}
                />
              </RecordRow>
            );
          })}
        </ListEditor>
      </Section>

      <Section id="revizyonlar" title="Revizyonlar" note="Yayımlanmış metindeki değişikliklerin kısa kaydı.">
        <ListEditor
          label="Revizyonlar"
          min={0}
          max={20}
          count={note.revisions.length}
          onAdd={() =>
            patch({ revisions: [...note.revisions, { rev: '', date: note.updated ?? note.published, text: pair() }] })
          }
          addLabel="Revizyon ekle"
        >
          {note.revisions.map((r, i) => {
            const set = (change: Partial<(typeof note.revisions)[number]>) =>
              patch({ revisions: note.revisions.map((x, j) => (j === i ? { ...x, ...change } : x)) });
            return (
              <RecordRow
                key={i}
                index={i}
                itemLabel="Revizyon"
                onUp={i > 0 ? () => patch({ revisions: swap(note.revisions, i, -1) }) : undefined}
                onDown={
                  i < note.revisions.length - 1 ? () => patch({ revisions: swap(note.revisions, i, 1) }) : undefined
                }
                onRemove={() => patch({ revisions: note.revisions.filter((_, j) => j !== i) })}
              >
                <TextField
                  name={`note-rev-${i}-rev`}
                  meta={{ label: 'Revizyon' }}
                  value={r.rev}
                  onChange={(v) => set({ rev: v })}
                />
                <TextField
                  name={`note-rev-${i}-date`}
                  meta={{ label: 'Tarih' }}
                  value={r.date}
                  onChange={(v) => set({ date: v })}
                />
                <PairText
                  name={`note-rev-${i}`}
                  label="Açıklama"
                  value={r.text}
                  onChange={(text) => set({ text })}
                  ctxs={ctxs}
                  multiline
                />
              </RecordRow>
            );
          })}
        </ListEditor>
      </Section>

      <Section id="yayin" title="Yayın" note="Bir not yalnız başlığı, özeti ve her bloğu dolu olan dilde yayımlanır.">
        {locales.map((l) => (
          <div key={l} className="a-field" role="group" aria-label={LANG_NAME[l]}>
            <p className="a-label">
              {l.toUpperCase()} · {noteLangStatus(note, l)}
            </p>
            {note.langs[l] === 'on' ? (
              <button type="button" className="a-btn" disabled={lastLive} onClick={() => setLang(note.id, l, 'off')}>
                Bu dilde yayınlama
              </button>
            ) : (
              <button type="button" className="a-btn" onClick={() => setLang(note.id, l, 'on')}>
                Bu dilde yayınla
              </button>
            )}
            <p className="a-help">
              {note.langs[l] === 'on'
                ? 'Metin silinmez; kapatılan dil genel sitede yer almaz.'
                : 'Bu dil genel sitede yok. Yazılan metin korunur.'}
            </p>
          </div>
        ))}
        {issues.length === 0 ? (
          <p className="a-help">Denetim sorunu yok.</p>
        ) : (
          <IssueList label="Tüm denetimler" issues={issues} />
        )}
        <div className="a-field">
          <button type="button" className="a-btn" onClick={() => setConfirmDelete(true)}>
            Notu sil
          </button>
        </div>
      </Section>
      <ConfirmDialog
        open={confirmDelete}
        title="Not silinsin mi?"
        confirmLabel="Sil"
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          removeNote(note.id);
          router.push('/admin/notlar');
        }}
      >
        <p>“{note.title.tr || note.id}” bu tarayıcı oturumundan kaldırılır.</p>
      </ConfirmDialog>
    </>
  );
}
