import { assertDevOnly } from '../../guard';
import { ProfileEditor } from './ProfileEditor';

export default function ProfileScreen() {
  assertDevOnly();
  return <ProfileEditor />;
}
