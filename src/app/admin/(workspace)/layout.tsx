import { devFixtureNotes, devFixtureProjects } from '@/content/media-manifest';
import { assertDevOnly } from '../guard';
import { AdminShell } from '../ui/AdminShell';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  assertDevOnly();
  // The samples are passed in from the server so their module stays out of production bundles.
  return (
    <AdminShell samples={devFixtureProjects()} noteSamples={devFixtureNotes()}>
      {children}
    </AdminShell>
  );
}
