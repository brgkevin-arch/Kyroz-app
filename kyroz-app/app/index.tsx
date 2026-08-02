import { Redirect } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import Splash from '../components/Splash';

export default function Index() {
  const { session, ready, hydrating } = useAuth();
  const { profile, loading } = useProfile();

  if (!ready || loading) return <Splash />;

  if (!session) return <Redirect href="/(auth)/login" />;
  // Rien en local ET le miroir cloud est encore en route → on attend (borné,
  // cf. HYDRATION_BUDGET_MS). Sans ça, on renverrait faire l'onboarding à
  // quelqu'un qui a déjà un compte et se connecte sur un 2e appareil.
  // Un profil DÉJÀ en local, lui, s'affiche tout de suite : il n'a rien à
  // attendre du réseau (c'est le bug « l'app se fige », cf. lib/boot.ts).
  if (!profile && hydrating) return <Splash />;
  return <Redirect href={profile ? '/(tabs)/plan' : '/(auth)/onboarding'} />;
}
