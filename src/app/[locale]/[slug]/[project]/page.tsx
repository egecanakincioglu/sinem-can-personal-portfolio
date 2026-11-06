import type { Metadata } from 'next';
import { DetailView, detailMetadata, detailStaticParams } from '@/lib/detail-route';

// Project and note detail pages (see lib/detail-route.tsx). Unknown records are a 404.
export const dynamicParams = false;
export const generateStaticParams = () => detailStaticParams('project');

type Params = { params: Promise<{ locale: string; slug: string; project: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, slug, project } = await params;
  return detailMetadata(locale, slug, project);
}

export default async function DetailPage({ params }: Params) {
  const { locale, slug, project } = await params;
  return <DetailView locale={locale} slug={slug} entry={project} />;
}
