import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import Splash from '../components/Splash';

export default function Index() {
  const { session, ready } = useAuth();
  const { profile, loading } = useProfile();

  if (!ready || loading) return <Splash />;

  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href={profile ? '/(tabs)/plan' : '/(auth)/onboarding'} />;
}
