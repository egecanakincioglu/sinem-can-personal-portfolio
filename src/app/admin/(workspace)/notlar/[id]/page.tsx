import { figureIds } from '@/content/figures/registry';
import { devMediaAssets, mediaManifest } from '@/content/media-manifest';
import { assertDevOnly } from '../../../guard';
import { NoteEditor } from '../NoteEditor';

export default async function NoteEditorScreen({ params }: { params: Promise<{ id: string }> }) {
  assertDevOnly();
  const { id } = await params;
  // Figures and images come from the server so the sample modules stay out of production bundles.
  return (
    <NoteEditor id={decodeURIComponent(id)} figureIds={figureIds} assets={[...mediaManifest, ...devMediaAssets()]} />
  );
}
