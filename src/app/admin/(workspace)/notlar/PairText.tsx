'use client';

import { useState } from 'react';
import type { Locale } from '@/content/types';
import { Inline, type Ctx } from '@/lib/inline';
import { linkIssues } from '@/lib/note-record';
import { BilingualField } from '../../ui/controls';

type Pair = { tr: string; en: string };
export type Ctxs = Record<Locale, Ctx>;

/** The error of a text with a link target the public site would not follow, or nothing. */
export function linkError(text: string): string | undefined {
  const bad = linkIssues(text);
  return bad.length > 0 ? `Bağlantı https, / veya # ile başlamalı: ${bad[0]}. Bu blok kaydedilmedi.` : undefined;
}

/** A text with an error stays in the field only; the stored value keeps the last text that had none. */
export function useGuarded(
  stored: string,
  check: (text: string) => string | undefined,
  commit: (text: string) => void,
) {
  const [draft, setDraft] = useState<{ base: string; text: string } | null>(null);
  const held = draft !== null && draft.base === stored;
  return {
    value: held ? draft.text : stored,
    error: held ? check(draft.text) : undefined,
    onChange: (text: string) => {
      if (check(text)) setDraft({ base: stored, text });
      else {
        setDraft(null);
        commit(text);
      }
    },
  };
}

/** A TR/EN text with inline markup: the real inline renderer shows one live line per language. */
export function PairText({
  name,
  label,
  value,
  onChange,
  ctxs,
  multiline,
  helper,
  optional,
  max,
}: {
  name: string;
  label: string;
  value: Pair;
  onChange: (next: Pair) => void;
  ctxs: Ctxs;
  multiline?: boolean;
  helper?: string;
  optional?: boolean;
  max?: number;
}) {
  const tr = useGuarded(value.tr, linkError, (text) => onChange({ ...value, tr: text }));
  const en = useGuarded(value.en, linkError, (text) => onChange({ ...value, en: text }));
  const sides = { tr, en };
  return (
    <div className="a-pairtext">
      <BilingualField
        name={name}
        label={label}
        helper={helper}
        multiline={multiline}
        optional={optional}
        max={max}
        tr={tr.value}
        en={en.value}
        onTr={tr.onChange}
        onEn={en.onChange}
        errors={{ tr: tr.error, en: en.error }}
      />
      {(['tr', 'en'] as const).map((l) =>
        sides[l].value !== '' && !sides[l].error ? (
          <p key={l} className="a-help a-live" lang={l}>
            <span className="a-sfx">Önizleme · {l.toUpperCase()}: </span>
            <Inline text={sides[l].value} ctx={ctxs[l]} keyPrefix={`${name}-${l}`} />
          </p>
        ) : null,
      )}
    </div>
  );
}
