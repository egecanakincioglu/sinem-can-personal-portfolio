import { assertDevOnly } from '../../guard';
import { PageHeader } from '../../ui/PageHeader';
import { publicFieldPaths, registry } from '../../registry';
import { screenBySlug } from '../../screens';
import { checkCoverage, summarize } from '@/lib/field-registry';
import { KapsamMatrix } from './KapsamMatrix';

export default function KapsamScreen() {
  assertDevOnly();
  const s = screenBySlug('kapsam');
  const leaves = publicFieldPaths();
  return (
    <>
      <PageHeader kicker="Pafta 10" title={s?.title ?? 'Kapsam matrisi'} lede={s?.lede} />
      <KapsamMatrix summary={summarize(registry, leaves)} uncovered={checkCoverage(registry, leaves).uncovered} />
    </>
  );
}
