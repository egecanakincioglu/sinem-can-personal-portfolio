import { dict } from '@/content/dictionary';
import type { Locale } from '@/content/types';

/** "TR · EN" when the note exists in both languages, otherwise which one. Safe for server and client. */
export const langStatus = (langs: Locale[], locale: Locale) =>
  langs.length > 1
    ? dict.notes.langBoth[locale]
    : langs[0] === 'tr'
      ? dict.notes.langOnlyTr[locale]
      : dict.notes.langOnlyEn[locale];
