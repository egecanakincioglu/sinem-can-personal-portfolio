'use client';

import { Portrait } from '@/components/Portrait';
import { useAdmin } from './store';

/** The portrait as the preview language renders it. Reads the language itself, so only this re-renders on a switch. */
export function PreviewPortrait({ sizes }: { sizes: string }) {
  const { state, derived } = useAdmin();
  return <Portrait locale={state.previewLang} sizes={sizes} source={derived.portrait} />;
}
