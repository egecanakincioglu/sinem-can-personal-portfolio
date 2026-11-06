'use client';

import { useState } from 'react';
import type { ProjectRecord } from '@/content/projects/types';
import type { Copy } from '@/content/types';
import { newRecordId, toMeasurement, toResult, type ProjectIssue, type QuantityForm } from '@/lib/project-edit';
import { BilingualField, Disclosure, ListEditor, RecordRow } from '../../../ui/controls';
import { useAdminContent } from '../../../ui/store';
import {
  CopyList,
  MAX_ITEMS,
  OptionalCopy,
  QuantityEditor,
  QuantityList,
  emptyCopy,
  moved,
  quantityText,
} from './parts';

type Measurement = NonNullable<ProjectRecord['measurements']>[number];
type Calculation = NonNullable<ProjectRecord['calculations']>[number];
type Quantity = NonNullable<Calculation['given']>[number];
type Decision = NonNullable<ProjectRecord['decisions']>[number];
type TextModule = 'objective' | 'process' | 'methodology' | 'learnings' | 'results' | 'conclusions';

const EMPTY = 'Boş — sayfada görünmez';

/** Public render order of the page. The three texts before the data are paragraphs; so are the three after it. */
const textModules: Record<TextModule, { label: string; item: string }> = {
  objective: { label: 'Amaç', item: 'Paragraf' },
  process: { label: 'Süreç', item: 'Paragraf' },
  methodology: { label: 'Yöntem', item: 'Paragraf' },
  learnings: { label: 'Öğrenilenler', item: 'Paragraf' },
  results: { label: 'Sonuçlar', item: 'Paragraf' },
  conclusions: { label: 'Çıkarımlar', item: 'Paragraf' },
};

const meta = (n: number) => <span className="a-sfx">{n === 0 ? EMPTY : `${n} öğe`}</span>;

function TextModuleEditor({ project, which }: { project: ProjectRecord; which: TextModule }) {
  const { patchProject } = useAdminContent();
  const def = textModules[which];
  const items = project[which] ?? [];
  return (
    <Disclosure label={def.label} meta={meta(items.length)}>
      <CopyList
        label={def.label}
        name={`${project.id}.${which}`}
        itemLabel={def.item}
        items={items}
        multiline
        onChange={(next) => patchProject(project.id, { [which]: next.length ? next : undefined })}
      />
    </Disclosure>
  );
}

function CalculationEditor({
  calc,
  index,
  onChange,
}: {
  calc: Calculation;
  index: number;
  onChange: (next: Calculation) => void;
}) {
  const [editingResult, setEditingResult] = useState(false);
  const base = `calc.${calc.id}`;
  const list = (key: 'required' | 'assumptions' | 'method', label: string) => (
    <CopyList
      label={label}
      name={`${base}.${key}`}
      itemLabel={label}
      items={calc[key] ?? []}
      multiline
      onChange={(next) => onChange({ ...calc, [key]: next.length ? next : undefined })}
    />
  );
  // Givens carry no "Doğrulandı" tick; the shared converter is used with the tick implied.
  const convertGiven = (f: QuantityForm) => {
    const r = toResult({ ...f, verified: true });
    if (!r.ok) return r;
    const { symbol, label, value, digits, unit } = r.value;
    return {
      ok: true as const,
      value: {
        ...(symbol ? { symbol } : {}),
        label,
        value,
        ...(digits !== undefined ? { digits } : {}),
        ...(unit ? { unit } : {}),
      } satisfies Quantity,
    };
  };
  return (
    <div className="a-cad-form">
      <BilingualField
        name={`${base}.title`}
        label="Hesap başlığı"
        tr={calc.title.tr}
        en={calc.title.en}
        onTr={(v) => onChange({ ...calc, title: { ...calc.title, tr: v } })}
        onEn={(v) => onChange({ ...calc, title: { ...calc.title, en: v } })}
      />
      <QuantityList<Quantity>
        name={`${base}.given`}
        itemLabel="Verilen"
        items={calc.given ?? []}
        withSymbol
        askVerified={false}
        convert={convertGiven}
        onChange={(next) => onChange({ ...calc, given: next.length ? next : undefined })}
      />
      {list('required', 'İstenen')}
      {list('assumptions', 'Varsayım')}
      {list('method', 'Yöntem adımı')}
      <div className="a-list">
        <p className="a-label">Sonuç {index + 1}</p>
        {calc.result && !editingResult ? (
          <>
            <p className="a-num">{quantityText(calc.result)}</p>
            <div className="a-proj-actions">
              <button type="button" className="a-btn" onClick={() => setEditingResult(true)}>
                Sonucu düzenle
              </button>
              <button type="button" className="a-btn" onClick={() => onChange({ ...calc, result: undefined })}>
                Sonucu kaldır
              </button>
            </div>
          </>
        ) : (
          <QuantityEditor
            name={`${base}.result`}
            withSymbol
            askVerified
            initial={calc.result}
            submitLabel={calc.result ? 'Sonucu kaydet' : 'Sonuç ekle'}
            convert={toResult}
            onSubmit={(value) => {
              onChange({ ...calc, result: value });
              setEditingResult(false);
            }}
            onCancel={calc.result ? () => setEditingResult(false) : undefined}
          />
        )}
      </div>
    </div>
  );
}

function DecisionEditor({
  decision,
  warning,
  onChange,
}: {
  decision: Decision;
  warning?: string;
  onChange: (next: Decision) => void;
}) {
  const base = `decision.${decision.id}`;
  const criteria = decision.criteria ?? [];
  const setAlt = (i: number, patch: Partial<Decision['alternatives'][number]>) =>
    onChange({
      ...decision,
      alternatives: decision.alternatives.map((a, j) => (i === j ? { ...a, ...patch } : a)),
    });
  return (
    <div className="a-cad-form">
      <BilingualField
        name={`${base}.title`}
        label="Karar başlığı"
        tr={decision.title.tr}
        en={decision.title.en}
        onTr={(v) => onChange({ ...decision, title: { ...decision.title, tr: v } })}
        onEn={(v) => onChange({ ...decision, title: { ...decision.title, en: v } })}
      />
      <CopyList
        label="Ölçüt"
        name={`${base}.criteria`}
        itemLabel="Ölçüt"
        items={criteria}
        onChange={(next) => onChange({ ...decision, criteria: next.length ? next : undefined })}
      />
      <ListEditor
        label="Seçenekler"
        min={0}
        max={MAX_ITEMS}
        count={decision.alternatives.length}
        addLabel="Seçenek ekle"
        onAdd={() => onChange({ ...decision, alternatives: [...decision.alternatives, { name: emptyCopy() }] })}
      >
        {decision.alternatives.map((alt, i) => (
          <RecordRow
            key={i}
            index={i}
            itemLabel="Seçenek"
            onUp={
              i > 0 ? () => onChange({ ...decision, alternatives: moved(decision.alternatives, i, -1) }) : undefined
            }
            onDown={
              i < decision.alternatives.length - 1
                ? () => onChange({ ...decision, alternatives: moved(decision.alternatives, i, 1) })
                : undefined
            }
            onRemove={() => onChange({ ...decision, alternatives: decision.alternatives.filter((_, j) => j !== i) })}
          >
            <BilingualField
              name={`${base}.alt.${i}`}
              label={`Seçenek ${i + 1} adı`}
              tr={alt.name.tr}
              en={alt.name.en}
              onTr={(v) => setAlt(i, { name: { ...alt.name, tr: v } })}
              onEn={(v) => setAlt(i, { name: { ...alt.name, en: v } })}
            />
            {criteria.map((c, k) => (
              <OptionalCopy
                key={k}
                name={`${base}.alt.${i}.ev.${k}`}
                label={`Kanıt: ${c.tr || `ölçüt ${k + 1}`}`}
                value={alt.evidence?.[k]}
                onChange={(next) => {
                  const evidence: (Copy | undefined)[] = [...(alt.evidence ?? [])];
                  evidence[k] = next;
                  setAlt(i, { evidence: evidence.some(Boolean) ? evidence : undefined });
                }}
              />
            ))}
            <label className="a-check">
              <input
                type="checkbox"
                checked={alt.selected === true}
                onChange={(e) => setAlt(i, { selected: e.target.checked ? true : undefined })}
              />
              Seçilen seçenek {i + 1}
            </label>
          </RecordRow>
        ))}
      </ListEditor>
      {warning && (
        <p className="a-warn" role="status">
          Uyarı: {warning}
        </p>
      )}
      <OptionalCopy
        name={`${base}.rationale`}
        label="Gerekçe"
        multiline
        value={decision.rationale}
        onChange={(next) => onChange({ ...decision, rationale: next })}
      />
    </div>
  );
}

/** The body modules in the order the public page renders them. */
export function ProjectBody({ project, issues }: { project: ProjectRecord; issues: readonly ProjectIssue[] }) {
  const { patchProject } = useAdminContent();
  const patch = (p: Parameters<typeof patchProject>[1]) => patchProject(project.id, p);
  const measurements = project.measurements ?? [];
  const calculations = project.calculations ?? [];
  const decisions = project.decisions ?? [];
  const taken = [...calculations.map((c) => c.id), ...decisions.map((d) => d.id)];
  const text = (which: TextModule) => <TextModuleEditor key={which} project={project} which={which} />;
  return (
    <>
      <p className="a-help">Modüller sayfadaki sırayla listelenir; boş bir modül sayfada görünmez.</p>
      {text('objective')}
      {text('process')}
      {text('methodology')}
      <Disclosure label="Ölçümler" meta={meta(measurements.length)}>
        <QuantityList<Measurement>
          name={`${project.id}.measurements`}
          itemLabel="Ölçüm"
          items={measurements}
          askVerified
          convert={toMeasurement}
          onChange={(next) => patch({ measurements: next.length ? next : undefined })}
        />
      </Disclosure>
      <Disclosure label="Hesaplar" meta={meta(calculations.length)}>
        <ListEditor
          label="Hesaplar"
          min={0}
          max={MAX_ITEMS}
          count={calculations.length}
          addLabel="Hesap ekle"
          onAdd={() =>
            patch({
              calculations: [...calculations, { id: newRecordId('hesap', taken, Math.random), title: emptyCopy() }],
            })
          }
        >
          {calculations.map((c, i) => (
            <RecordRow
              key={c.id}
              index={i}
              meta={c.id}
              itemLabel="Hesap"
              onUp={i > 0 ? () => patch({ calculations: moved(calculations, i, -1) }) : undefined}
              onDown={
                i < calculations.length - 1 ? () => patch({ calculations: moved(calculations, i, 1) }) : undefined
              }
              onRemove={() => {
                const next = calculations.filter((_, j) => j !== i);
                patch({ calculations: next.length ? next : undefined });
              }}
            >
              <CalculationEditor
                calc={c}
                index={i}
                onChange={(next) => patch({ calculations: calculations.map((x, j) => (i === j ? next : x)) })}
              />
            </RecordRow>
          ))}
        </ListEditor>
      </Disclosure>
      <Disclosure label="Tasarım kararları" meta={meta(decisions.length)}>
        <ListEditor
          label="Kararlar"
          min={0}
          max={MAX_ITEMS}
          count={decisions.length}
          addLabel="Karar ekle"
          onAdd={() =>
            patch({
              decisions: [
                ...decisions,
                { id: newRecordId('karar', taken, Math.random), title: emptyCopy(), alternatives: [] },
              ],
            })
          }
        >
          {decisions.map((d, i) => (
            <RecordRow
              key={d.id}
              index={i}
              meta={d.id}
              itemLabel="Karar"
              onUp={i > 0 ? () => patch({ decisions: moved(decisions, i, -1) }) : undefined}
              onDown={i < decisions.length - 1 ? () => patch({ decisions: moved(decisions, i, 1) }) : undefined}
              onRemove={() => {
                const next = decisions.filter((_, j) => j !== i);
                patch({ decisions: next.length ? next : undefined });
              }}
            >
              <DecisionEditor
                decision={d}
                warning={issues.find((x) => x.field === `decisions.${i}`)?.message.replace(/^Uyarı: /, '')}
                onChange={(next) => patch({ decisions: decisions.map((x, j) => (i === j ? next : x)) })}
              />
            </RecordRow>
          ))}
        </ListEditor>
      </Disclosure>
      {text('learnings')}
      {text('results')}
      {text('conclusions')}
    </>
  );
}
