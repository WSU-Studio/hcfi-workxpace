import LoginForm from './LoginForm';
import { isMicrosoftEntraSsoConfigured } from '@/lib/auth/microsoft-sso';

export default function LoginPage() {
  const showMicrosoftLogin = isMicrosoftEntraSsoConfigured();
  return <LoginForm showMicrosoftLogin={showMicrosoftLogin} />;
}
