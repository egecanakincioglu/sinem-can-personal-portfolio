import { projectRecords } from '@/content/projects/published';
import { devFixtureProjects, devMediaAssets, mediaManifest } from '@/content/media-manifest';
import { getSiteContent } from '@/content/site-content';
import { mediaTasks, mediaUsage } from '@/lib/media';
import { assertDevOnly } from '../../guard';
import { MediaEditor } from './MediaEditor';

export default function MediaScreen() {
  assertDevOnly();
  const samples = devMediaAssets();
  const projects = [...projectRecords, ...devFixtureProjects()];
  return (
    <MediaEditor
      assets={mediaManifest}
      samples={samples}
      usage={mediaUsage([...mediaManifest, ...samples], getSiteContent().portrait?.src ?? null, projects)}
      tasks={mediaTasks(mediaManifest)}
    />
  );
}
