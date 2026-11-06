import { devFixtureProjects, devMediaAssets, mediaManifest, PORTRAIT_ASSET_ID } from '@/content/media-manifest';
import { buildDevGlb } from '@/lib/dev-glb';
import { glbLibrary } from '@/lib/glb';
import { assertDevOnly } from '../../guard';
import { CadScreen } from './CadScreen';

export default function CadScreenPage() {
  assertDevOnly();
  // Everything is passed in from the server so the sample modules stay out of production bundles. The demo
  // model's size is measured here, from the bytes the development route would serve.
  return (
    <CadScreen
      assets={[...mediaManifest, ...devMediaAssets()]}
      portraitId={PORTRAIT_ASSET_ID}
      library={glbLibrary(buildDevGlb().length)}
      projectCount={devFixtureProjects().length}
    />
  );
}
