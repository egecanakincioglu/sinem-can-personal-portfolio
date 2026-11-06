import { devMediaAssets, mediaManifest, PORTRAIT_ASSET_ID } from '@/content/media-manifest';
import { buildDevGlb } from '@/lib/dev-glb';
import { glbLibrary } from '@/lib/glb';
import { assertDevOnly } from '../../../guard';
import { ProjectEditor } from './ProjectEditor';

export default async function ProjectEditorPage({ params }: { params: Promise<{ id: string }> }) {
  assertDevOnly();
  const { id } = await params;
  // Everything is passed in from the server so the sample modules stay out of production bundles.
  return (
    <ProjectEditor
      id={decodeURIComponent(id)}
      assets={[...mediaManifest, ...devMediaAssets()]}
      portraitId={PORTRAIT_ASSET_ID}
      library={glbLibrary(buildDevGlb().length)}
    />
  );
}
