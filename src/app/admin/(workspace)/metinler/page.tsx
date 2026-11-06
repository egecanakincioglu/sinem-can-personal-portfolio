import { assertDevOnly } from '../../guard';
import { InterfaceStrings } from './InterfaceStrings';

export default function InterfaceStringsScreen() {
  assertDevOnly();
  return <InterfaceStrings />;
}
