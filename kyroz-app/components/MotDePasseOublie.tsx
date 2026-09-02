import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Presse } from './Presse';
import { useTheme, ThemePalette, Spacing, Type, OPACITE_PRESSION, CIBLE_TACTILE_MIN } from '../constants/theme';
import { Field, PrimaryButton } from './ui';
import { useAuth } from '../hooks/useAuth';
import { useCompteARebours } from '../hooks/useCompteARebours';
import {
  CODE_LONGUEUR, DELAI_RENVOI_S, MDP_LONGUEUR_MIN,
  codeComplet, normaliseCode, motDePasseValide, traduitErreurReinitialisation,
} from '../lib/emailConfirmation';

// ── Mot de passe oublié — le seul recours quand le mot de passe est perdu ─────
//
// Avant le 2026-08-07, il n'y en avait AUCUN : `resetPasswordForEmail` n'était
// appelé nulle part, et l'écran de connexion ne proposait rien. Un mot de passe
// oublié = un compte perdu, sans autre issue que d'écrire à contact@kyroz.app.
//
// Trois étapes, et elles sont séparées à dessein : on peut abandonner entre deux
// (fermer l'app en allant chercher le code), et chacune a ses propres erreurs à
// expliquer. Un seul écran qui ferait tout laisserait l'utilisateur devant un
// message qui ne parle pas de ce qu'il vient de faire.
//
// ⚠️ L'e-mail ne contient PAS de lien — c'est le code seul. Le raisonnement complet
// est dans `lib/emailConfirmation.ts` : pour une réinitialisation, cliquer un lien
// consomme le jeton SANS changer le mot de passe, ce qui laisse la personne dans
// un état pire qu'avant sa demande.

type Etape = 'email' | 'code' | 'motdepasse';

export default function MotDePasseOublie({
  emailInitial, onAnnuler, onTermine,
}: {
  emailInitial: string;
  /** Retour à l'écran de connexion, sans rien avoir changé. */
  onAnnuler: () => void;
  /** Mot de passe changé ET session ouverte — l'appelant peut router vers l'app. */
  onTermine: () => void;
}) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const { sendPasswordReset, verifyPasswordReset, setNewPassword } = useAuth();

  const [etape, setEtape] = useState<Etape>('email');
  const [email, setEmail] = useState(emailInitial);
  const [code, setCode] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [renvoiDans, setRenvoiDans] = useCompteARebours();

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const demanderCode = async () => {
    if (!emailValide || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await sendPasswordReset(email);
    setBusy(false);
    // ⚠️ On passe à l'étape suivante MÊME EN CAS D'ADRESSE INCONNUE, et le message
    // reste au conditionnel. Supabase répond « succès » sans dire si le compte
    // existe (anti-énumération) : afficher « aucun compte avec cette adresse »
    // transformerait ce formulaire en outil pour savoir qui est inscrit chez Kyroz.
    // Le prix assumé : qui se trompe d'adresse attend un code qui ne viendra pas.
    if (res.error) { setError(traduitErreurReinitialisation(res.error)); return; }
    setRenvoiDans(DELAI_RENVOI_S);
    setEtape('code');
  };

  const renvoyer = async () => {
    if (renvoiDans > 0 || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await sendPasswordReset(email);
    setBusy(false);
    setRenvoiDans(DELAI_RENVOI_S);
    if (res.error) { setError(traduitErreurReinitialisation(res.error)); return; }
    // Le nouvel envoi INVALIDE le code précédent : le dire, sinon quelqu'un saisit
    // celui du premier e-mail et croit que l'app se trompe.
    setCode('');
    setNotice('Nouveau code envoyé. Utilise celui du dernier e-mail reçu, les précédents ne valent plus.');
  };

  const validerCode = async () => {
    if (!codeComplet(code) || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await verifyPasswordReset(email, code);
    setBusy(false);
    if (res.error) { setError(traduitErreurReinitialisation(res.error)); return; }
    // Le code valide OUVRE une session : c'est elle qui autorise `updateUser`.
    // ⚠️ Donc à partir d'ici, l'utilisateur est authentifié même s'il abandonne —
    // son ancien mot de passe reste valable, rien n'est cassé.
    setEtape('motdepasse');
  };

  const enregistrer = async () => {
    if (!motDePasseValide(motDePasse) || busy) return;
    setBusy(true); setError(null); setNotice(null);
    const res = await setNewPassword(motDePasse);
    setBusy(false);
    if (res.error) { setError(traduitErreurReinitialisation(res.error)); return; }
    onTermine();
  };

  return (
    <>
      {etape === 'email' && (
        <>
          <Text style={s.titre}>Mot de passe oublié</Text>
          <Text style={s.texte}>
            Entre l'adresse de ton compte. On t'envoie un code à {CODE_LONGUEUR} chiffres pour en choisir un nouveau.
          </Text>

          <View style={s.espace} />

          <Field
            t={t} label="Email" value={email} onChangeText={setEmail}
            placeholder="toi@email.com" keyboardType="email-address"
            autoComplete="email" autoCapitalize="none" autoCorrect={false}
          />

          {error && <Text style={s.error}>{error}</Text>}

          <View style={s.espacePetit} />
          <PrimaryButton t={t} label="Recevoir un code" onPress={demanderCode} disabled={!emailValide} loading={busy} />
        </>
      )}

      {etape === 'code' && (
        <>
          <Text style={s.titre}>Entre ton code</Text>
          <Text style={s.texte}>
            Si un compte existe pour <Text style={s.fort}>{email.trim()}</Text>, un code à {CODE_LONGUEUR} chiffres vient d'y être envoyé.
          </Text>

          <View style={s.espace} />

          <Field
            t={t} label={`Code à ${CODE_LONGUEUR} chiffres`} value={code}
            onChangeText={(v) => setCode(normaliseCode(v))}
            placeholder="000000" keyboardType="number-pad" maxLength={CODE_LONGUEUR}
            textContentType="oneTimeCode" autoComplete="one-time-code"
          />

          {error && <Text style={s.error}>{error}</Text>}
          {notice && <Text style={s.notice}>{notice}</Text>}

          <View style={s.espacePetit} />
          <PrimaryButton t={t} label="Valider le code" onPress={validerCode} disabled={!codeComplet(code)} loading={busy} />

          <Presse onPress={renvoyer} disabled={renvoiDans > 0 || busy} activeOpacity={OPACITE_PRESSION} style={s.lien}>
            <Text style={[s.lienTxt, renvoiDans > 0 && { color: t.textTertiary }]}>
              {renvoiDans > 0 ? `Renvoyer un code (${renvoiDans} s)` : 'Renvoyer un code'}
            </Text>
          </Presse>

          <Text style={s.aide}>Rien reçu ? Regarde dans les indésirables.</Text>
        </>
      )}

      {etape === 'motdepasse' && (
        <>
          <Text style={s.titre}>Nouveau mot de passe</Text>
          <Text style={s.texte}>Choisis-en un nouveau. Il remplace l'ancien immédiatement.</Text>

          <View style={s.espace} />

          <Field
            t={t} label="Nouveau mot de passe" value={motDePasse} onChangeText={setMotDePasse}
            placeholder={`${MDP_LONGUEUR_MIN} caractères minimum`} secureTextEntry
            autoComplete="new-password" autoCapitalize="none"
          />

          {error && <Text style={s.error}>{error}</Text>}

          <View style={s.espacePetit} />
          <PrimaryButton
            t={t} label="Enregistrer et continuer" onPress={enregistrer}
            disabled={!motDePasseValide(motDePasse)} loading={busy}
          />
        </>
      )}

      {/* Sortie de secours, présente aux trois étapes : personne ne doit se
          retrouver coincé dans un parcours qu'il a ouvert par curiosité. */}
      <Presse onPress={onAnnuler} activeOpacity={OPACITE_PRESSION} style={s.lien}>
        <Text style={s.lienTxt}>Revenir à la connexion</Text>
      </Presse>
    </>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    titre: { ...Type.h2, color: t.text, textAlign: 'center' },
    texte: { ...Type.body, color: t.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: Spacing.md },
    fort: { ...Type.bodyStrong, color: t.text },
    espace: { height: Spacing.lg },
    espacePetit: { height: Spacing.sm },
    error: { ...Type.bodySmallStrong, color: t.danger, textAlign: 'center', marginTop: Spacing.lg },
    notice: { ...Type.bodySmallStrong, color: t.accent, textAlign: 'center', marginTop: Spacing.lg, lineHeight: 20 },
    // Un lien reste une CIBLE : `minHeight` garantit les 44 pt d'Apple, que le
    // seul texte centré n'atteindrait pas (CLAUDE.md §8).
    lien: { minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center', marginTop: Spacing.md },
    lienTxt: { ...Type.bodyStrong, color: t.textSecondary, textAlign: 'center' },
    aide: { ...Type.caption, color: t.textTertiary, textAlign: 'center', lineHeight: 19, marginTop: Spacing.sm },
  });
}
