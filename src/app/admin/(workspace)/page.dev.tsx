import { assertDevOnly } from '../guard';
import { Overview } from './Overview';

export default function OverviewScreen() {
  assertDevOnly();
  return <Overview />;
}
