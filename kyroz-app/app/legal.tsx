import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Type, Fond, Icone, OPACITE_PRESSION } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { PRIVACY_POLICY, TERMS_OF_USE, LegalSection, LEGAL } from '../constants/legal';

// Écran « Confidentialité & CGU » — route racine /legal, atteignable depuis le
// login (case de consentement) et le profil. Contenu = source unique constants/legal.
export default function LegalScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[s.header, layout.header]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} activeOpacity={OPACITE_PRESSION}>
          <Ionicons name="chevron-back" size={Icone.nav} color={t.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confidentialité & CGU</Text>
      </View>

      <ScrollView contentContainerStyle={[s.content, layout.content]} showsVerticalScrollIndicator={false}>
        <Text style={s.docTitle}>Politique de confidentialité</Text>
        <Text style={s.updated}>Dernière mise à jour : {LEGAL.effectiveDate}</Text>
        {PRIVACY_POLICY.map((sec) => <Section key={sec.title} t={t} s={s} sec={sec} />)}

        <View style={s.divider} />

        <Text style={s.docTitle}>Conditions générales d'utilisation</Text>
        {TERMS_OF_USE.map((sec) => <Section key={sec.title} t={t} s={s} sec={sec} />)}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ t, s, sec }: { t: ThemePalette; s: ReturnType<typeof makeStyles>; sec: LegalSection }) {
  return (
    <View style={s.section}>
      <Text style={s.secTitle}>{sec.title}</Text>
      {sec.paragraphs.map((p, i) => <Text key={i} style={s.para}>{p}</Text>)}
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    // Pas de liseré sous l'en-tête : la DA pose les blocs par le fond et
    // l'espacement, pas par des traits. Le seul séparateur gardé est celui qui
    // sépare DEUX documents (`divider`), parce qu'il porte du sens.
    header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
    headerTitle: { color: t.text, ...Type.h3 },
    content: { padding: Spacing.xl, paddingBottom: Fond.ecran, gap: Spacing.xs },
    docTitle: { color: t.text, ...Type.h2, marginTop: Spacing.sm },
    updated: { ...Type.caption, color: t.textTertiary, marginTop: Spacing.xs, marginBottom: Spacing.sm },
    section: { marginTop: Spacing.lg },
    secTitle: { color: t.text, ...Type.bodyStrong, marginBottom: Spacing.sm },
    para: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 21, marginBottom: Spacing.sm },
    divider: { height: 1, backgroundColor: t.line, marginVertical: Spacing.xxl },
  });
}
