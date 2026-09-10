import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking } from 'react-native';
import { Presse } from '../components/Presse';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Fond, Icone, OPACITE_PRESSION, CIBLE_TACTILE_MIN } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { methodologie, MethodoSection, MethodoSource } from '../lib/methodologie';
import { DISCLAIMER } from '../constants/legal';

// Écran « Méthodologie & sources » — route racine /methodologie, atteignable depuis
// Profil -> roue dentée -> Aide et retours.
//
// Exigé par Apple 1.4.1 : divulguer les données et les méthodes derrière une mesure
// liée à la santé. Le contenu vit dans lib/methodologie.ts, qui LIT les constantes du
// moteur — cet écran ne fait que le rendre, et ne doit contenir AUCUN chiffre.
export default function MethodologieScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();
  const sections = useMemo(() => methodologie(), []);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[s.header, layout.header]}>
        <Presse onPress={() => router.back()} hitSlop={10} activeOpacity={OPACITE_PRESSION}>
          <Ionicons name="chevron-back" size={Icone.nav} color={t.text} />
        </Presse>
        <Text style={s.headerTitle}>Méthodologie & sources</Text>
      </View>

      <ScrollView contentContainerStyle={[s.content, layout.content]} showsVerticalScrollIndicator={false}>
        <Text style={s.intro}>
          Comment Kyroz calcule ce qu'il te propose, et sur quoi il s'appuie.
        </Text>

        {sections.map((sec) => <Section key={sec.titre} s={s} sec={sec} />)}

        <View style={s.divider} />
        <Text style={s.disclaimer}>{DISCLAIMER}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ s, sec }: { s: ReturnType<typeof makeStyles>; sec: MethodoSection }) {
  return (
    <View style={s.section}>
      <Text style={s.secTitle}>{sec.titre}</Text>
      {sec.paragraphes.map((p, i) => <Text key={i} style={s.para}>{p}</Text>)}
      {sec.sources?.length ? (
        <View style={s.sources}>
          <Text style={s.sourcesLabel}>Sources</Text>
          {sec.sources.map((src) => <Source key={src.titre} s={s} src={src} />)}
        </View>
      ) : null}
    </View>
  );
}

// ── Une source, et son lien ──────────────────────────────────────────────────
//
// 🔴 CES CITATIONS ÉTAIENT DU TEXTE MORT JUSQU'AU 2026-09-10, et c'est ce qui a valu
// le rejet 1.4.1 : *« provides health or medical recommendations in the binary without
// citations, such as links to sources for this information »*. Les huit références
// étaient pourtant là, exactes et complètes — Apple ne les compte pas comme des
// citations tant qu'on ne peut pas les OUVRIR.
//
// ⚠️ **Le lien est VISIBLE, pas seulement actif.** Rendre le titre cliquable sans rien
// montrer aurait laissé un relecteur passer à côté : rien à l'écran ne dit qu'un texte
// gris est tapable. La ligne `doi.org/10.…` souligné est ce qu'il cherche, et c'est
// aussi ce qui permet à un lecteur de recopier la référence hors de l'app.
//
// ⚠️ `canOpenURL` d'abord, comme partout ailleurs dans ce dépôt (`app/avis.tsx`,
// `ReglagesSheet.tsx`) : `openURL` échoue en SILENCE quand rien ne sait ouvrir l'URL,
// et un lien mort passerait pour un lien cassé chez Apple.
function Source({ s, src }: { s: ReturnType<typeof makeStyles>; src: MethodoSource }) {
  const citation = (
    <Text style={s.source}>
      {src.auteurs}. <Text style={s.sourceTitre}>{src.titre}</Text>. {src.publication}.
    </Text>
  );
  if (!src.lien) return citation;

  const ouvrir = async () => {
    const ok = await Linking.canOpenURL(src.lien!).catch(() => false);
    if (ok) Linking.openURL(src.lien!);
  };

  return (
    <Presse
      onPress={ouvrir}
      activeOpacity={OPACITE_PRESSION}
      accessibilityRole="link"
      accessibilityLabel={`Ouvrir la source : ${src.titre}`}
      style={s.sourceBloc}
    >
      {citation}
      <Text style={s.sourceLien} numberOfLines={1}>{lienLisible(src.lien)}</Text>
    </Presse>
  );
}

/** `https://doi.org/10.1093/ajcn/51.2.241` → `doi.org/10.1093/ajcn/51.2.241`.
 *  Le schéma ne dit rien à personne et vole la largeur qui, elle, identifie l'article. */
function lienLisible(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
    headerTitle: { color: t.text, ...Type.h3 },
    content: { padding: Spacing.xl, paddingBottom: Fond.ecran, gap: Spacing.xs },
    intro: { ...Type.bodySmall, color: t.textTertiary, lineHeight: 21, marginBottom: Spacing.sm },
    section: { marginTop: Spacing.lg },
    secTitle: { color: t.text, ...Type.bodyStrong, marginBottom: Spacing.sm },
    para: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 21, marginBottom: Spacing.sm },
    // Les sources sont en retrait et plus petites : elles se consultent, elles ne se
    // lisent pas d'affilée. Le fond les détache sans avoir besoin d'un trait.
    sources: { backgroundColor: t.fill, borderRadius: Radius.sm, padding: Spacing.lg, gap: Spacing.sm, marginTop: Spacing.xs },
    sourcesLabel: { ...Type.label, color: t.textSecondary },
    source: { ...Type.caption, color: t.textTertiary, lineHeight: 18 },
    sourceTitre: { color: t.textSecondary },
    // Le bloc entier est la cible tactile : le titre et le lien appartiennent à la
    // même référence, en séparer la zone sensible ferait deux gestes pour une chose.
    // ⚠️ `minHeight` et pas du padding gonflé : la référence tient sur deux ou trois
    // lignes selon la largeur, donc sa hauteur RÉELLE dépasse la cible — mais elle est
    // invérifiable statiquement, et un garde-fou ne doit pas dépendre d'un calcul de
    // rendu. On DÉCLARE la cible (CLAUDE.md §8, `espacementDA.test.ts` la compte).
    sourceBloc: { gap: Spacing.xs, paddingVertical: Spacing.xs, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center' as const },
    // Souligné, PAS coloré : la DA de Kyroz n'a pas de couleur de lien (l'accent est
    // une couleur de FOND, cf. constants/theme.ts). Le soulignement est le seul signe
    // de tapabilité qui tienne sur les deux thèmes et les six accents.
    sourceLien: { ...Type.caption, color: t.textSecondary, textDecorationLine: 'underline' as const, lineHeight: 18 },
    divider: { height: 1, backgroundColor: t.line, marginVertical: Spacing.xxl },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center' },
  });
}
