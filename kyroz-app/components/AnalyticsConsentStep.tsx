import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Presse } from './Presse';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTheme, ThemePalette, Spacing, Radius, Type, Trait, Icone, OPACITE_PRESSION, CIBLE_TACTILE_MIN } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { AnalyticsConsent } from '../lib/analytics';

// ── L'écran de consentement aux statistiques d'usage ─────────────────────────
//
// Il REMPLACE la carte qui s'affichait au-dessus du plan alimentaire (l'ancien
// `AnalyticsConsentBanner`, supprimé le 2026-08-10 — décision fondateur : « ça
// gâche la page principale de l'app »). Deux défauts, pas un :
//   • la PLACE — la première chose vue sur l'écran d'arrivée était une demande ;
//   • le MOMENT — juste après le premier plan, c'est-à-dire pile sur l'instant
//     que tout l'onboarding sert à préparer.
//
// 🔴 IL EST POSÉ AVANT L'ASSISTANT, ET C'EST LA MOITIÉ DE LA DÉCISION.
// `capture()` ne garde RIEN tant que le consentement n'est pas donné, et le tampon
// local a été écarté (synthèse §3.2 : écrire des events sur l'appareil pour une
// finalité non essentielle relève probablement de l'article 82). Donc tout ce qui
// précède la réponse est perdu POUR TOUJOURS, pour tout le monde. Demander après le
// premier plan aurait supprimé d'un coup la décision D1 (« où l'inscription
// décroche-t-elle ? ») — et un décrochage d'inscription est justement le seul signal
// lisible à 40 utilisateurs, là où la rétention demande des mois.
// ➡️ Déplacer cet écran plus tard dans le parcours, c'est supprimer D1. Pas la
// dégrader : la supprimer.
//
// ⚠️ Le texte ci-dessous est une PROMESSE, et elle doit correspondre exactement à
// ce que `lib/analytics.ts` envoie (règle maison : pas de mensonge dans Kyroz).
// Ajouter une propriété à un event sans relire cet écran, c'est le rendre faux.

interface Props {
  onChoose: (c: AnalyticsConsent) => void;
}

/** Ce qui part réellement, dit en français. Miroir de `Events` — les cinq lignes
 *  couvrent les 13 events, groupés par ce que la personne RECONNAÎT avoir fait. */
const MESURE = [
  'Les étapes de l’inscription, pour voir laquelle fait abandonner',
  'L’ouverture de ton plan et les repas que tu coches',
  'Les regénérations de plan et les écarts que tu déclares',
  'Les paliers de ta série',
  'Les erreurs de l’app et les plans qui échouent à se générer',
];

/** ⚠️ Cette liste n'est pas de la réassurance décorative : c'est l'interdit absolu
 *  du §6 de la synthèse, celui qui décide ce qu'une propriété d'event a le droit
 *  de contenir. Si une ligne devient fausse, c'est l'event qu'il faut corriger. */
const JAMAIS = [
  'Aucune donnée de santé : ni poids, ni taille, ni âge, ni sexe, ni objectif, ni régime, ni sport',
  'Ni ton prénom, ni ton e-mail, ni tes photos de progression',
  'Rien de ce que tu écris toi-même',
];

export default function AnalyticsConsentStep({ onChoose }: Props) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const repondre = (c: AnalyticsConsent) => {
    if (busy) return;
    setBusy(true);
    onChoose(c);
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={[s.content, layout.content]} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Aider à réparer Kyroz</Text>
        <Text style={s.sub}>
          Kyroz tourne entièrement sur ton téléphone : sans mesure, on ne voit rien de ce
          qui casse chez toi. Tu peux nous laisser regarder comment l’app est utilisée —
          ou pas. Ça ne change strictement rien à ton plan.
        </Text>

        <View style={s.card}>
          <View style={s.cardHead}>
            <Ionicons name="stats-chart-outline" size={Icone.standard} color={t.text} />
            <Text style={s.cardTitle}>Ce qui serait mesuré</Text>
          </View>
          {MESURE.map((l) => (
            <View key={l} style={s.ligne}>
              <View style={[s.puce, { backgroundColor: t.textTertiary }]} />
              <Text style={s.ligneTxt}>{l}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.cardHead}>
            <Ionicons name="lock-closed-outline" size={Icone.standard} color={t.text} />
            <Text style={s.cardTitle}>Ce qui ne l’est jamais</Text>
          </View>
          {JAMAIS.map((l) => (
            <View key={l} style={s.ligne}>
              <View style={[s.puce, { backgroundColor: t.textTertiary }]} />
              <Text style={s.ligneTxt}>{l}</Text>
            </View>
          ))}
        </View>

        {/* « Pseudonyme » et non « anonyme » : l'identifiant est stable, donc les
            mesures d'un même téléphone se regroupent — c'est ce qui rend possible
            la suppression sur demande. Promettre l'anonymat ET la suppression
            serait se contredire (synthèse §3.3). */}
        {/* ⚠️ CETTE NOTE NE NOMMAIT PERSONNE, et c'est le trou qu'on ne voit pas en la
            relisant : « hébergées dans l'Union européenne » se lit « hébergées par
            Kyroz, en Europe ». Un consentement qui ne dit pas À QUI les données vont
            n'est pas éclairé (RGPD art. 13-1-e) — et c'est le seul écran où il se
            donne. ➡️ Le destinataire se nomme ICI, pas seulement dans la politique.
            ⚠️ Et « dans l'UE » ne suffit pas non plus : le STOCKAGE est à Francfort,
            le transit passe par des points de présence mondiaux. On dit ce qu'on
            sait — le stockage — sans transformer une localisation de serveurs en
            promesse plus large que ce qu'elle couvre. */}
        <Text style={s.note}>
          Les mesures sont rattachées à un identifiant pseudonyme tiré au hasard sur ton
          téléphone — jamais à ton compte, jamais à ton e-mail. Elles sont envoyées à
          PostHog, l’outil qui nous sert à les lire, et stockées sur ses serveurs de
          Francfort au moins un an.
        </Text>
        <Text style={s.note}>
          Tu peux changer d’avis quand tu veux dans Réglages, et demander la suppression
          de ce qui a déjà été envoyé.
        </Text>
        {/* Le lien vise la route IN-APP, jamais une URL web : Kyroz fonctionne hors
            ligne, et `/legal` est rendu depuis `constants/legal.ts` — la même source
            que la page publique. Un lien web serait mort dans l'avion et pourrait
            servir un texte plus vieux que celui de l'app. */}
        <Presse
          onPress={() => router.push('/legal')}
          hitSlop={10}
          activeOpacity={OPACITE_PRESSION}
          accessibilityRole="link"
        >
          <Text style={s.lien}>Tout est détaillé dans Confidentialité &amp; CGU</Text>
        </Presse>
      </ScrollView>

      {/* Deux boutons de MÊME taille : refuser doit coûter exactement le même geste
          qu'accepter. Un « Non merci » rétréci ou grisé serait un consentement
          arraché, donc pas un consentement. */}
      <View style={[s.footer, layout.header]}>
        <View style={s.row}>
          <Presse
            style={[s.btn, { backgroundColor: t.fill }]}
            onPress={() => repondre('denied')}
            disabled={busy}
            activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button"
          >
            <Text style={{ ...Type.label, color: t.textSecondary }}>Non merci</Text>
          </Presse>
          <Presse
            style={[s.btn, { backgroundColor: t.accent }]}
            onPress={() => repondre('granted')}
            disabled={busy}
            activeOpacity={OPACITE_PRESSION}
            accessibilityRole="button"
          >
            <Text style={{ ...Type.label, color: t.onAccent }}>D’accord</Text>
          </Presse>
        </View>
        <Text style={s.micro}>Ton plan, tes recettes et tes courses fonctionnent pareil dans les deux cas.</Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxl },
    title: { color: t.text, ...Type.h1 },
    sub: { ...Type.body, color: t.textSecondary, lineHeight: 22 },
    card: { backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.md },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    cardTitle: { ...Type.label, color: t.text },
    ligne: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
    // La puce se cale sur la première ligne du texte à côté : c'est un décalage
    // optique, mais il vaut un cran de la grille — donc il passe par le token.
    puce: { width: 4, height: 4, borderRadius: 2, marginTop: Spacing.sm },
    ligneTxt: { ...Type.bodySmall, color: t.textSecondary, flex: 1, lineHeight: 20 },
    note: { ...Type.caption, color: t.textTertiary, lineHeight: 18 },
    lien: { ...Type.caption, color: t.accent, lineHeight: 18, textDecorationLine: 'underline' },
    footer: { padding: Spacing.xl, paddingTop: Spacing.sm, backgroundColor: t.bg, borderTopWidth: Trait.fin, borderTopColor: t.line, gap: Spacing.md },
    row: { flexDirection: 'row', gap: Spacing.md },
    btn: { flex: 1, minHeight: CIBLE_TACTILE_MIN, paddingVertical: Spacing.lg, borderRadius: Radius.button, alignItems: 'center', justifyContent: 'center' },
    micro: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center' },
  });
}
