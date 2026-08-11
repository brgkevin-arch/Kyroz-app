import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Presse } from '../components/Presse';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Fond, Icone, OPACITE_PRESSION } from '../constants/theme';
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
          Comment Kyroz calcule ce qu'il vous propose, et sur quoi il s'appuie.
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

function Source({ s, src }: { s: ReturnType<typeof makeStyles>; src: MethodoSource }) {
  return (
    <Text style={s.source}>
      {src.auteurs}. <Text style={s.sourceTitre}>{src.titre}</Text>. {src.publication}.
    </Text>
  );
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
    divider: { height: 1, backgroundColor: t.line, marginVertical: Spacing.xxl },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center' },
  });
}
