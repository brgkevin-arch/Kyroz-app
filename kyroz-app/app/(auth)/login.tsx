import React, { useEffect, useMemo, useState } from 'react';
import { Presse } from '../../components/Presse';
import { retour } from '../../lib/retourHaptique';
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
import { appleSignInAvailable } from '../../lib/appleAuth';
import { AppleSignInButton } from '../../components/AppleSignInButton';
import { DISCLAIMER } from '../../constants/legal';
import { isReviewLogin } from '../../lib/reviewAccess';
import {
  CODE_LONGUEUR, DELAI_RENVOI_S, MDP_LONGUEUR_MIN,
  codeComplet, normaliseCode, traduitErreurConfirmation,
} from '../../lib/emailConfirmation';
import { useCompteARebours } from '../../hooks/useCompteARebours';
import MotDePasseOublie from '../../components/MotDePasseOublie';
import { IntroCarousel } from '../../components/IntroCarousel';
import { introDejaVue, marquerIntroVue } from '../../lib/introVu';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();
  const { signIn, signUp, confirmEmail, resendConfirmation, signInGuest, signInWithApple, confirmAppleConsent, signOut } = useAuth();

  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ── L'ACCUEIL, AVANT LE FORMULAIRE ─────────────────────────────────────────
  //
  // 🔴 Le tout premier écran d'un utilisateur réel était e-mail + mot de passe, à
  // froid : « Continuer en invité » est encadré `__DEV__`, donc invisible en
  // production, et le plan n'apparaissait qu'après le compte créé ET les sept
  // étapes d'inscription.
  //
  // ⚠️ `undefined` = ON NE SAIT PAS ENCORE. Trois états, pas deux : sans le
  // troisième, le premier rendu montrerait le formulaire puis sauterait sur le
  // carrousel une frame plus tard — un écran qui s'ouvre sur un clignotement.
  // C'est la même garde que `brouillonLu` dans l'inscription.
  const [introVue, setIntroVue] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    let vivant = true;
    introDejaVue().then((vue) => { if (vivant) setIntroVue(vue); });
    return () => { vivant = false; };
  }, []);

  /**
   * Pose un message d'erreur ET le fait sentir. Un seul point d'entrée, pour deux
   * raisons : les cinq branches d'échec de cet écran doivent se comporter pareil,
   * et surtout `setError(null)` — qui NETTOIE — ne doit rien émettre. Deux
   * fonctions plutôt qu'un `if` dans une seule : c'est l'appelant qui sait s'il
   * annonce un échec ou s'il fait le ménage.
   *
   * ℹ️ Un mot de passe refusé est le cas d'école du retour d'erreur : le message
   * s'affiche sous le champ, c'est-à-dire hors du regard de quelqu'un qui vient
   * d'appuyer sur le bouton — la main l'apprend avant l'œil.
   */
  const refuser = (message: string) => { retour('refus'); setError(message); };

  // Adresse dont la confirmation est en attente. Non nulle = l'écran affiche la
  // saisie du code, pas le formulaire.
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [renvoiDans, setRenvoiDans] = useCompteARebours();

  // Parcours « mot de passe oublié » — un composant à part (components/MotDePasseOublie),
  // parce qu'il porte trois étapes à lui seul et que cet écran en a déjà trois.
  const [oubli, setOubli] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailValid && password.length >= MDP_LONGUEUR_MIN && (mode === 'signin' || consent);

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
    if (res.error) { refuser(translate(res.error)); return; }
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
    if (res.error) { refuser(traduitErreurConfirmation(res.error)); return; }
    // `verifyOtp` ouvre la session : rien à ressaisir, on entre directement.
    router.replace('/');
  };

  const renvoyer = async () => {
    if (!aConfirmer || renvoiDans > 0 || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await resendConfirmation(aConfirmer);
    setBusy(false);
    setRenvoiDans(DELAI_RENVOI_S);
    if (res.error) { refuser(traduitErreurConfirmation(res.error)); return; }
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
      refuser('Connexion invité indisponible. Active l\'auth anonyme dans Supabase (Authentication → Providers → Anonymous).');
      return;
    }
    router.replace('/'); // session anonyme ouverte → l'index route vers l'onboarding
  };

  // ── Sign in with Apple ───────────────────────────────────────────────────
  //
  // Faux tant qu'on n'a pas la réponse d'`appleSignInAvailable()` — un `useState`
  // à part plutôt que de dériver `purchasesConfigured()`-like, parce que la
  // disponibilité dépend de l'APPAREIL (compte enfant, restriction), pas
  // seulement de la plateforme ou d'une clé posée.
  const [appleDispo, setAppleDispo] = useState(false);
  useEffect(() => { appleSignInAvailable().then(setAppleDispo); }, []);

  // Non nul UNIQUEMENT pendant la fenêtre entre l'ouverture de la session Apple
  // et le consentement recueilli : l'écran affiche alors le même bloc de
  // consentement que l'inscription par e-mail, plutôt que le formulaire.
  const [appleConsentEnAttente, setAppleConsentEnAttente] = useState(false);

  const connecterApple = async () => {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    const r = await signInWithApple();
    setBusy(false);
    if (r.statut === 'annule') return;           // l'utilisateur a renoncé : rien à dire
    if (r.statut === 'indisponible') { refuser('Connexion Apple indisponible sur cet appareil.'); return; }
    if (r.statut === 'echec') { refuser(translate(r.message)); return; }
    // r.statut === 'ok'
    if (r.consentRequis) {
      // ⚠️ Une session Supabase est DÉJÀ ouverte à cet instant (Apple a validé
      // le jeton) — mais on reste volontairement sur cet écran : `router.replace`
      // n'est appelé qu'après le consentement, jamais avant. Sans ce verrou,
      // l'index routerait vers l'onboarding avec `consent_health_data` resté à
      // `false` en silence — le trou RGPD des parcours OAuth (cf. lib/appleAuth.ts).
      setConsent(false);
      setAppleConsentEnAttente(true);
      return;
    }
    router.replace('/');
  };

  const validerConsentApple = async () => {
    if (!consent || busy) return;
    setBusy(true); setError(null);
    const res = await confirmAppleConsent(true);
    setBusy(false);
    if (res.error) { refuser(res.error); return; }
    setAppleConsentEnAttente(false);
    router.replace('/');
  };

  // Refuser le consentement referme la session ouverte par Apple : on ne
  // laisse jamais une session sans consentement traîner sur l'appareil.
  const annulerConsentApple = async () => {
    if (busy) return;
    setBusy(true);
    await signOut();
    setBusy(false);
    setAppleConsentEnAttente(false);
    setConsent(false);
  };

  // ⚠️ CE RETOUR ANTICIPÉ VIENT APRÈS TOUS LES HOOKS, ET CE N'EST PAS UN DÉTAIL DE
  // MISE EN FORME. Les `useState`/`useEffect` de la connexion Apple sont déclarés
  // juste au-dessus : les placer APRÈS un `return` conditionnel en ferait des appels
  // de hooks conditionnels — React changerait d'ordre de hooks entre deux rendus,
  // et l'écran casserait au premier passage du carrousel au formulaire.
  // Lecture de stockage local, quasi instantanée — même geste que la ligne de
  // consentement de l'inscription.
  if (introVue === undefined) return null;
  if (!introVue) {
    return (
      <IntroCarousel
        onTermine={() => {
          // L'écran passe TOUT DE SUITE : le drapeau part en arrière-plan, il ne
          // retient pas le tap. Une écriture ratée ne coûte qu'un défilement de plus.
          setIntroVue(true);
          void marquerIntroVue();
        }}
      />
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.content, layout.content]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={s.logo}>KYROZ</Text>
          <Text style={s.tagline}>Ton plan nutrition, sans réfléchir.</Text>

          <View style={{ height: 28 }} />

          {appleConsentEnAttente ? (
            <>
              {/* ── Consentement santé pour un compte Apple neuf ────────────
                  Même case, même texte que l'inscription par e-mail — c'est le
                  MÊME consentement RGPD, seul le chemin qui y mène diffère. */}
              <Text style={s.titreConfirmation}>Avant de continuer</Text>
              <Text style={s.texteConfirmation}>
                Apple a confirmé ton identité. Il reste une case à cocher pour ouvrir ton compte Kyroz.
              </Text>

              <View style={{ height: 18 }} />

              <Presse style={s.consent} onPress={() => setConsent((c) => !c)} activeOpacity={OPACITE_PRESSION}>
                <View style={[s.check, { borderColor: consent ? t.accent : t.lineStrong, backgroundColor: consent ? t.accent : 'transparent' }]}>
                  {consent && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
                </View>
                <Text style={s.consentTxt}>
                  J'accepte que mes données (poids, taille, composition corporelle, objectif, régime) — des <Text style={{ fontWeight: '700', color: t.textSecondary }}>données de santé</Text> — soient traitées pour générer mes plans. Stockage en Europe, supprimables à tout moment.
                </Text>
              </Presse>

              {error && <Text style={s.error}>{error}</Text>}

              <View style={{ height: 10 }} />
              <PrimaryButton
                t={t} label="Continuer" onPress={validerConsentApple}
                disabled={!consent} loading={busy}
              />

              <Presse onPress={annulerConsentApple} disabled={busy} activeOpacity={OPACITE_PRESSION} style={s.lienSecondaire}>
                <Text style={s.lienSecondaireTxt}>Annuler</Text>
              </Presse>
            </>
          ) : oubli ? (
            <MotDePasseOublie
              emailInitial={email}
              onAnnuler={() => { setOubli(false); setError(null); setNotice(null); }}
              onTermine={() => router.replace('/')}
            />
          ) : aConfirmer ? (
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

              <Presse
                onPress={renvoyer} disabled={renvoiDans > 0 || busy}
                activeOpacity={OPACITE_PRESSION} style={s.lienSecondaire}
              >
                <Text style={[s.lienSecondaireTxt, renvoiDans > 0 && { color: t.textTertiary }]}>
                  {renvoiDans > 0 ? `Renvoyer l'e-mail (${renvoiDans} s)` : 'Renvoyer l\'e-mail'}
                </Text>
              </Presse>

              <Text style={s.aideConfirmation}>
                Rien reçu ? Regarde dans les indésirables. Si tu as cliqué le lien de l'e-mail, ton adresse est déjà confirmée : connecte-toi.
              </Text>

              <Presse onPress={retourConnexion} activeOpacity={OPACITE_PRESSION} style={s.lienSecondaire}>
                <Text style={s.lienSecondaireTxt}>Revenir à la connexion</Text>
              </Presse>
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
            <Presse style={s.consent} onPress={() => setConsent((c) => !c)} activeOpacity={OPACITE_PRESSION}>
              <View style={[s.check, { borderColor: consent ? t.accent : t.lineStrong, backgroundColor: consent ? t.accent : 'transparent' }]}>
                {consent && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
              </View>
              <Text style={s.consentTxt}>
                J'accepte que mes données (poids, taille, composition corporelle, objectif, régime) — des <Text style={{ fontWeight: '700', color: t.textSecondary }}>données de santé</Text> — soient traitées pour générer mes plans. Stockage en Europe, supprimables à tout moment.
              </Text>
            </Presse>
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

          {/* Sortie de secours du compte perdu. En CONNEXION seulement : à
              l'inscription, il n'y a pas encore de mot de passe à oublier. */}
          {mode === 'signin' && (
            <Presse
              onPress={() => { setOubli(true); setError(null); setNotice(null); }}
              activeOpacity={OPACITE_PRESSION} style={s.lienSecondaire}
            >
              <Text style={s.lienSecondaireTxt}>Mot de passe oublié ?</Text>
            </Presse>
          )}

          {appleDispo && (
            <>
              <View style={s.guestRow}>
                <View style={s.guestLine} />
                <Text style={s.guestOr}>ou</Text>
                <View style={s.guestLine} />
              </View>
              <View style={{ marginTop: Spacing.lg }}>
                <AppleSignInButton onPress={connecterApple} disabled={busy} />
              </View>
            </>
          )}

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
              <Presse onPress={guest} disabled={busy} activeOpacity={OPACITE_PRESSION} testID="guest-login">
                <Text style={s.guest}>Continuer en invité</Text>
              </Presse>
            </>
          )}
          </>
          )}

          <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          <Presse onPress={() => router.push('/legal')} activeOpacity={OPACITE_PRESSION}>
            <Text style={s.legalLink}>Politique de confidentialité & CGU</Text>
          </Presse>
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
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center', marginTop: Spacing.xl },
    legalLink: { ...Type.captionStrong, color: t.textTertiary, textAlign: 'center', marginTop: Spacing.md, textDecorationLine: 'underline' },
  });
}
