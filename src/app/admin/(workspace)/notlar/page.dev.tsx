import { devFixtureNotes, devFixtureProjects } from '@/content/media-manifest';
import { assertDevOnly } from '../../guard';
import { NoteList } from './NoteList';

export default function NotesScreen() {
  assertDevOnly();
  // The samples are passed in from the server so their module stays out of production bundles.
  return <NoteList samples={devFixtureNotes()} projectSamples={devFixtureProjects()} />;
}
