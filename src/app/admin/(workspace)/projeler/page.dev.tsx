import { devFixtureNotes, devFixtureProjects } from '@/content/media-manifest';
import { assertDevOnly } from '../../guard';
import { ProjectList } from './ProjectList';

export default function ProjectsScreen() {
  assertDevOnly();
  // The samples are passed in from the server so their module stays out of production bundles.
  return <ProjectList samples={devFixtureProjects()} noteSamples={devFixtureNotes()} />;
}
