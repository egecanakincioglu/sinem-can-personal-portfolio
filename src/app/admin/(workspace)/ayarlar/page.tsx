import { assertDevOnly } from '../../guard';
import { SettingsEditor } from './SettingsEditor';

export default function SettingsScreen() {
  assertDevOnly();
  return <SettingsEditor />;
}
