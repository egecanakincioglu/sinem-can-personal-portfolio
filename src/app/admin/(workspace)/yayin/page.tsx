import { assertDevOnly } from '../../guard';
import { YayinScreen } from './YayinScreen';

export default function PublishScreen() {
  assertDevOnly();
  return <YayinScreen />;
}
