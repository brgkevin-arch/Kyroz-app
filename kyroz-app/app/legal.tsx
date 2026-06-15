import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing } from '../constants/theme';
import { PRIVACY_POLICY, TERMS_OF_USE, LegalSection, LEGAL } from '../constants/legal';

// Écran « Confidentialité & CGU » — route racine /legal, atteignable depuis le
// login (case de consentement) et le profil. Contenu = source unique constants/legal.
export default function LegalScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const router = useRouter();

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={26} color={t.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Confidentialité & CGU</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
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
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.xl, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.line },
    headerTitle: { color: t.text, fontSize: 18, fontWeight: '800', letterSpacing: -0.4 },
    content: { padding: Spacing.xl, paddingBottom: 60, gap: 4 },
    docTitle: { color: t.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginTop: 8 },
    updated: { color: t.textTertiary, fontSize: 12, marginTop: 2, marginBottom: 8 },
    section: { marginTop: 16 },
    secTitle: { color: t.text, fontSize: 15, fontWeight: '700', marginBottom: 6 },
    para: { color: t.textSecondary, fontSize: 14, lineHeight: 21, marginBottom: 8 },
    divider: { height: 1, backgroundColor: t.line, marginVertical: 24 },
  });
}
