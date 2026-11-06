import { redirect } from 'next/navigation';
import { assertDevOnly } from '../../guard';
import { PreviewSkeleton } from './PreviewSkeleton';

// Admin-side address of the live preview. The Homepage preview needs the PUBLIC root layout (fonts,
// globals.css, lang) which cannot coexist with admin.css in this separate root layout, so it lives at
// /[locale]/dev-preview/live and this route forwards there. Screens without a connected preview keep the skeleton.
export default async function Onizleme({
  params,
  searchParams,
}: {
  params: Promise<{ yol: string[] }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  assertDevOnly();
  const { yol } = await params;
  const { lang } = await searchParams;
  if (yol[0] === 'ana-sayfa') redirect(`/${lang === 'en' ? 'en' : 'tr'}/dev-preview/live`);
  if (yol[0] === 'profil') redirect(`/${lang === 'en' ? 'en' : 'tr'}/dev-preview/live-profile`);
  if (yol[0] === 'projeler') redirect(`/${lang === 'en' ? 'en' : 'tr'}/dev-preview/live-project`);
  return <PreviewSkeleton path={yol.join('/')} />;
}
