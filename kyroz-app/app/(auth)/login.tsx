import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Fond, Trait, Icone, OPACITE_PRESSION, CIBLE_TACTILE_MIN } from '../../constants/theme';
import { useLayout } from '../../constants/layout';
import { Field, PrimaryButton, Segmented } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { DISCLAIMER } from '../../constants/legal';
import { isReviewLogin } from '../../lib/reviewAccess';
import { CODE_LONGUEUR, codeComplet, normaliseCode, traduitErreurConfirmation } from '../../lib/emailConfirmation';

type Mode = 'signin' | 'signup';

/** Délai avant de pouvoir redemander un e-mail. Supabase refuse plus vite que ça
 *  (60 s côté serveur) : sans compte à rebours visible, l'utilisateur appuie et
 *  reçoit une erreur qu'il lit comme une panne. */
const DELAI_RENVOI_S = 60;

export default function LoginScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();
  const { signIn, signUp, confirmEmail, resendConfirmation, signInGuest } = useAuth();

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Adresse dont la confirmation est en attente. Non nulle = l'écran affiche la
  // saisie du code, pas le formulaire.
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [renvoiDans, setRenvoiDans] = useState(0);

  useEffect(() => {
    if (renvoiDans <= 0) return;
    const id = setInterval(() => setRenvoiDans((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(id);
  }, [renvoiDans]);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && password.length >= 6 && (mode === 'signin' || consent);

  const submit = async () => {
    if (!canSubmit || busy) return;
    // Accès reviewer store : identifiants sentinelle + code secret du build
    // (EXPO_PUBLIC_REVIEW_CODE) → session invité, sans confirmation e-mail. Inerte
    // si le code n'est pas posé (web public) → cf. lib/reviewAccess + STORE-RELEASE.
    if (mode === 'signin' && isReviewLogin(email, password, process.env.EXPO_PUBLIC_REVIEW_CODE)) {
      return guest();
    }
    setBusy(true); setError(null); setNotice(null);
    const res = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password, consent);
    setBusy(false);
    if (res.error) { setError(translate(res.error)); return; }
    // Inscription sans session = confirmation e-mail à valider. On enchaîne SUR PLACE
    // avec la saisie du code reçu — l'utilisateur ne quitte pas l'app, et il n'a rien
    // à retenir. Renvoyer ici sur un formulaire de connexion vide ferait croire à un bug.
    if ('needsConfirmation' in res && res.needsConfirmation) {
      setAConfirmer(email.trim());
      setPassword('');
      setCode('');
      setRenvoiDans(DELAI_RENVOI_S);
      return;
    }
    router.replace('/'); // l'index route ensuite selon session + profil
  };

  const confirmer = async () => {
    if (!aConfirmer || !codeComplet(code) || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await confirmEmail(aConfirmer, code);
    setBusy(false);
    if (res.error) { setError(traduitErreurConfirmation(res.error)); return; }
    // `verifyOtp` ouvre la session : rien à ressaisir, on entre directement.
    router.replace('/');
  };

  const renvoyer = async () => {
    if (!aConfirmer || renvoiDans > 0 || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await resendConfirmation(aConfirmer);
    setBusy(false);
    setRenvoiDans(DELAI_RENVOI_S);
    if (res.error) { setError(traduitErreurConfirmation(res.error)); return; }
    // ⚠️ Le nouvel envoi INVALIDE le code précédent : le dire, sinon quelqu'un
    // saisit celui du premier e-mail et croit que l'app se trompe.
    setCode('');
    setNotice('Nouvel e-mail envoyé. Utilise le code du dernier reçu, les précédents ne valent plus.');
  };

  const retourConnexion = () => {
    setAConfirmer(null);
    setCode('');
    setMode('signin');
    setError(null);
    setNotice('Adresse confirmée ? Connecte-toi avec ton e-mail et ton mot de passe.');
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
        <ScrollView contentContainerStyle={[s.content, layout.content]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.logo}>KYROZ</Text>
          <Text style={s.tagline}>Ton plan nutrition, sans réfléchir.</Text>

          <View style={{ height: 28 }} />

          {aConfirmer ? (
            <>
              {/* ── Confirmation d'adresse : le code reçu par e-mail ────────────
                  L'utilisateur reste ICI. Le lien de l'e-mail marche aussi, mais
                  il ouvre un navigateur et ne sait pas revenir dans l'app (aucun
                  lien universel n'est configuré) — cf. lib/emailConfirmation.ts. */}
              <Text style={s.titreConfirmation}>Confirme ton adresse</Text>
              <Text style={s.texteConfirmation}>
                Un code à {CODE_LONGUEUR} chiffres vient de partir vers <Text style={s.adresse}>{aConfirmer}</Text>. Saisis-le ici.
              </Text>

              <View style={{ height: 18 }} />

              <Field
                t={t} label={`Code à ${CODE_LONGUEUR} chiffres`} value={code}
                onChangeText={(v) => setCode(normaliseCode(v))}
                placeholder="000000" keyboardType="number-pad"
                maxLength={CODE_LONGUEUR}
                // Le code arrive par e-mail, pas par SMS : `oneTimeCode` permet à iOS
                // de le proposer au collage depuis la notification.
                textContentType="oneTimeCode" autoComplete="one-time-code"
              />

              {error && <Text style={s.error}>{error}</Text>}
              {notice && <Text style={s.notice}>{notice}</Text>}

              <View style={{ height: 10 }} />
              <PrimaryButton
                t={t} label="Confirmer mon adresse" onPress={confirmer}
                disabled={!codeComplet(code)} loading={busy}
              />

              <TouchableOpacity
                onPress={renvoyer} disabled={renvoiDans > 0 || busy}
                activeOpacity={OPACITE_PRESSION} style={s.lienSecondaire}
              >
                <Text style={[s.lienSecondaireTxt, renvoiDans > 0 && { color: t.textQuaternary }]}>
                  {renvoiDans > 0 ? `Renvoyer l'e-mail (${renvoiDans} s)` : 'Renvoyer l\'e-mail'}
                </Text>
              </TouchableOpacity>

              <Text style={s.aideConfirmation}>
                Rien reçu ? Regarde dans les indésirables. Si tu as cliqué le lien de l'e-mail, ton adresse est déjà confirmée : connecte-toi.
              </Text>

              <TouchableOpacity onPress={retourConnexion} activeOpacity={OPACITE_PRESSION} style={s.lienSecondaire}>
                <Text style={s.lienSecondaireTxt}>Revenir à la connexion</Text>
              </TouchableOpacity>
            </>
          ) : (
          <>
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
            <TouchableOpacity style={s.consent} onPress={() => setConsent((c) => !c)} activeOpacity={OPACITE_PRESSION}>
              <View style={[s.check, { borderColor: consent ? t.accent : t.lineStrong, backgroundColor: consent ? t.accent : 'transparent' }]}>
                {consent && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
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
              <TouchableOpacity onPress={guest} disabled={busy} activeOpacity={OPACITE_PRESSION} testID="guest-login">
                <Text style={s.guest}>Continuer en invité</Text>
              </TouchableOpacity>
            </>
          )}
          </>
          )}

          <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          <TouchableOpacity onPress={() => router.push('/legal')} activeOpacity={OPACITE_PRESSION}>
            <Text style={s.legalLink}>Politique de confidentialité & CGU</Text>
          </TouchableOpacity>
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
    content: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl, paddingBottom: Fond.feuille },
    logo: { ...Type.display, color: t.text, letterSpacing: 6, textAlign: 'center' },
    tagline: { ...Type.body, color: t.textSecondary, textAlign: 'center', marginTop: Spacing.md },
    consent: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', marginTop: Spacing.lg, paddingHorizontal: Spacing.xs },
    check: { width: 24, height: 24, borderRadius: Radius.sm - 4, borderWidth: Trait.controle, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
    consentTxt: { ...Type.caption, flex: 1, color: t.textTertiary, lineHeight: 19 },
    titreConfirmation: { ...Type.h2, color: t.text, textAlign: 'center' },
    texteConfirmation: { ...Type.body, color: t.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: Spacing.md },
    adresse: { ...Type.bodyStrong, color: t.text },
    // Un lien secondaire reste une CIBLE : `minHeight` garantit les 44 pt d'Apple,
    // que le seul texte centré n'atteindrait pas (cf. CLAUDE.md §8, espacement).
    lienSecondaire: { minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', marginTop: Spacing.md },
    lienSecondaireTxt: { ...Type.bodyStrong, color: t.textSecondary, textAlign: 'center' },
    aideConfirmation: { ...Type.caption, color: t.textTertiary, textAlign: 'center', lineHeight: 19, marginTop: Spacing.sm },
    error: { ...Type.bodySmallStrong, color: t.danger, textAlign: 'center', marginTop: Spacing.lg },
    notice: { ...Type.bodySmallStrong, color: t.accent, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 20 },
    social: { ...Type.caption, color: t.textTertiary, textAlign: 'center', marginTop: Spacing.xl },
    guestRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xxl },
    guestLine: { flex: 1, height: 1, backgroundColor: t.line },
    guestOr: { ...Type.caption, color: t.textTertiary },
    guest: { ...Type.bodyStrong, color: t.textSecondary, textAlign: 'center', marginTop: Spacing.lg },
    disclaimer: { ...Type.micro, color: t.textQuaternary, lineHeight: 16, textAlign: 'center', marginTop: Spacing.xl },
    legalLink: { ...Type.captionStrong, color: t.textTertiary, textAlign: 'center', marginTop: Spacing.md, textDecorationLine: 'underline' },
  });
}
