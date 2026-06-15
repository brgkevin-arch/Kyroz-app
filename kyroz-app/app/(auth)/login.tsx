import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius } from '../../constants/theme';
import { Field, PrimaryButton, Segmented } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { DISCLAIMER } from '../../constants/legal';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();
  const { signIn, signUp, signInGuest } = useAuth();

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6 && (mode === 'signin' || consent);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, consent);
    setBusy(false);
    if (res.error) { setError(translate(res.error)); return; }
    // Inscription sans session = confirmation email à valider → on explique
    // plutôt que de renvoyer sur un formulaire vide (l'utilisateur croirait à un bug).
    if ('needsConfirmation' in res && res.needsConfirmation) {
      setMode('signin');
      setPassword('');
      setNotice('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis connecte-toi.');
      return;
    }
    router.replace('/'); // l'index route ensuite selon session + profil
  };

  const guest = async () => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await signInGuest();
    setBusy(false);
    if (res.error) {
      setError('Connexion invité indisponible. Active l\'auth anonyme dans Supabase (Authentication → Providers → Anonymous).');
      return;
    }
    router.replace('/'); // session anonyme ouverte → l'index route vers l'onboarding
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.logo}>KYROZ</Text>
          <Text style={s.tagline}>Ton plan nutrition, sans réfléchir.</Text>

          <View style={{ height: 28 }} />

          <Segmented
            t={t}
            options={[{ label: 'Inscription', value: 'signup' }, { label: 'Connexion', value: 'signin' }]}
            value={mode}
            onChange={(m) => { setMode(m as Mode); setError(null); setNotice(null); }}
          />

          <View style={{ height: 18 }} />

          <Field
            t={t} label="Email" value={email} onChangeText={setEmail}
            placeholder="toi@email.com" keyboardType="email-address"
            autoComplete="email" autoCapitalize="none" autoCorrect={false}
          />
          <Field
            t={t} label="Mot de passe" value={password} onChangeText={setPassword}
            placeholder="6 caractères minimum" secureTextEntry
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} autoCapitalize="none"
          />

          {mode === 'signup' && (
            <TouchableOpacity style={s.consent} onPress={() => setConsent((c) => !c)} activeOpacity={0.7}>
              <View style={[s.check, { borderColor: consent ? t.accent : t.lineStrong, backgroundColor: consent ? t.accent : 'transparent' }]}>
                {consent && <Ionicons name="checkmark" size={14} color={t.onAccent} />}
              </View>
              <Text style={s.consentTxt}>
                J'accepte que mes données (poids, objectif, régime) — des <Text style={{ fontWeight: '700', color: t.textSecondary }}>données de santé</Text> — soient traitées pour générer mes plans. Stockage en Europe, supprimables à tout moment.
              </Text>
            </TouchableOpacity>
          )}

          {error && <Text style={s.error}>{error}</Text>}
          {notice && <Text style={s.notice}>{notice}</Text>}

          <View style={{ height: 10 }} />
          <PrimaryButton
            t={t}
            label={mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
            onPress={submit}
            disabled={!canSubmit}
            loading={busy}
          />

          <Text style={s.social}>Connexion Apple & Google bientôt — avec l'app iOS.</Text>

          {/* Connexion invité : outil de test (manuel + Playwright). Masquée en
              PROD pour fermer le vecteur d'abus (création anonyme de comptes en
              masse — cf. audit sécu). __DEV__ = vrai en dev, faux après
              `expo export` → invisible sur le web public déployé. */}
          {__DEV__ && (
            <>
              <View style={s.guestRow}>
                <View style={s.guestLine} />
                <Text style={s.guestOr}>ou</Text>
                <View style={s.guestLine} />
              </View>
              <TouchableOpacity onPress={guest} disabled={busy} activeOpacity={0.7} testID="guest-login">
                <Text style={s.guest}>Continuer en invité</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={s.disclaimer}>{DISCLAIMER}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Quelques messages d'erreur Supabase fréquents → français.
function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email ou mot de passe incorrect.';
  if (m.includes('already registered') || m.includes('already exists')) return 'Un compte existe déjà avec cet email.';
  if (m.includes('password')) return 'Mot de passe trop court (6 caractères minimum).';
  if (m.includes('email')) return 'Email invalide.';
  return msg;
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl, paddingBottom: 40 },
    logo: { color: t.text, fontSize: 34, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
    tagline: { color: t.textSecondary, fontSize: 15, textAlign: 'center', marginTop: 10 },
    consent: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 16, paddingHorizontal: 2 },
    check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    consentTxt: { flex: 1, color: t.textTertiary, fontSize: 13, lineHeight: 19 },
    error: { color: t.danger, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 16 },
    notice: { color: t.accent, fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 16, lineHeight: 20 },
    social: { color: t.textTertiary, fontSize: 12, textAlign: 'center', marginTop: 18 },
    guestRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 },
    guestLine: { flex: 1, height: 1, backgroundColor: t.line },
    guestOr: { color: t.textTertiary, fontSize: 12 },
    guest: { color: t.textSecondary, fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 16 },
    disclaimer: { color: t.textQuaternary, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 20 },
  });
}
