'use client';

import { useState } from 'react';
import { dict } from '@/content/dictionary';
import type { Locale } from '@/content/types';
import { fullDate } from '@/lib/format';
import type { NoteItem } from '@/lib/notes';
import { langStatus } from '@/lib/note-view';

const d = dict.notes;

/** Archive rows: date · title and deck · topic, reading time, language. Hover = Pafta. */
export function NoteList({ items, locale, filterable }: { items: NoteItem[]; locale: Locale; filterable: boolean }) {
  const [topic, setTopic] = useState<string | null>(null);
  const topics = filterable ? Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[])) : [];
  const shown = topic ? items.filter((i) => i.category === topic) : items;

  return (
    <div>
      {topics.length > 1 && (
        <div role="group" aria-label={d.topics[locale]} className="mb-2 flex flex-wrap gap-x-6 text-[15px]">
          {[null, ...topics].map((t) => (
            <button
              key={t ?? 'all'}
              type="button"
              aria-pressed={topic === t}
              onClick={() => setTopic(t)}
              className={`inline-flex min-h-11 items-center ${topic === t ? 'font-serif text-[17px] italic' : 'ulink font-medium'}`}
            >
              {t ?? d.allTopics[locale]}
            </button>
          ))}
        </div>
      )}
      <ul className="border-t border-grafit" aria-live={filterable ? 'polite' : undefined}>
        {shown.map((n) => (
          <li key={n.id} className="note-row relative border-b border-cizgi">
            <article className="g12 -mx-4 px-4 py-7 md:-mx-6 md:px-6 md:py-9 lg:py-10">
              <p className="t-meta tnum col-[1/-1] lg:col-[1/3] lg:pt-2.5">
                <time dateTime={n.date}>{fullDate(n.date, locale)}</time>
              </p>
              <div className="col-[1/-1] mt-2 lg:col-[3/10] lg:mt-0">
                <h3 className="serif text-[clamp(1.625rem,2.6vw,2rem)] leading-[1.12] tracking-[-0.01em] text-balance">
                  <a href={n.href} className="note-link">
                    {n.title}
                  </a>
                </h3>
                <p className="mt-2 max-w-[52ch] text-kursun">{n.summary}</p>
              </div>
              <p className="t-meta col-[1/-1] mt-4 flex flex-wrap gap-x-4 gap-y-1 lg:col-[10/13] lg:mt-0 lg:flex-col lg:gap-1 lg:pt-2.5">
                {n.category && (
                  <span className="font-serif text-[15px] italic font-normal text-grafit">{n.category}</span>
                )}
                <span className="tnum">{d.minRead[locale].replace('{n}', String(n.minutes))}</span>
                <span>{langStatus(n.langs, locale)}</span>
                {n.fixture && <span className="text-grafit">{d.fixtureLabel[locale]}</span>}
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
