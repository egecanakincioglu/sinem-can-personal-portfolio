import { assertDevOnly } from '../guard';
import { AdminShell } from '../ui/AdminShell';

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  assertDevOnly();
  return <AdminShell>{children}</AdminShell>;
}
