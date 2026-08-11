import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Trait } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { PrimaryButton } from './ui';
import { recordScreeningPassed } from '../lib/healthScreening';

// Écran d'AVERTISSEMENT santé, affiché une fois avant l'assistant d'onboarding
// (cf. app/(auth)/onboarding.tsx).
//
// 🔴 IL NE POSE PLUS DE QUESTION ET NE BLOQUE PLUS PERSONNE — 2026-08-11, décision
// fondateur sur avis juridique. Le pourquoi complet est en tête de lib/healthScreening.ts ;
// en une phrase : subordonner l'accès à la grossesse ou à l'état de santé est un refus
// de service fondé sur deux critères de discrimination, et la réponse recueillie était
// elle-même une donnée de santé qu'aucun texte n'obligeait à collecter.
//
// ⚠️ NE PAS « RÉTABLIR LE GARDE-FOU » EN REMETTANT DES CASES. Ce qui protège n'a jamais
// été la question — une réponse déclarée ne prouve rien — mais l'avertissement, qui
// reste, et les hard blocks qui MESURENT (âge, IMC, volume, planchers du moteur).

export default function HealthScreening({ onPass }: { onPass: () => void }) {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const [busy, setBusy] = useState(false);

  const onContinue = async () => {
    if (busy) return;
    setBusy(true);
    await recordScreeningPassed();
    onPass();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={[s.content, layout.content]} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Avant de commencer</Text>
        <Text style={s.sub}>
          Kyroz calcule des plans nutrition précis pour des adultes en bonne santé. Ces
          plans ne conviennent pas à toutes les situations et ne remplacent pas un avis
          médical.
        </Text>

        {/* Le renvoi vers un professionnel de santé exigé par Apple (1.4.1) et Google.
            Il est DIT, plus vérifié — c'est tout le changement du 2026-08-11. */}
        <View style={s.avertBox}>
          <Text style={s.avertTxt}>
            Enceinte, allaitante, ou suivie pour une pathologie chronique ? Parles-en à
            un médecin avant de suivre un plan.
          </Text>
        </View>
      </ScrollView>

      <View style={[s.footer, layout.header]}>
        <PrimaryButton t={t} label="J'ai compris" onPress={onContinue} loading={busy} />
        <Text style={s.disclaimer}>
          Kyroz est conçu pour des adultes en bonne santé et ne remplace pas l'avis d'un
          médecin ou diététicien-nutritionniste.
        </Text>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1, justifyContent: 'center' },
    title: { color: t.text, ...Type.h1 },
    sub: { ...Type.body, color: t.textSecondary, lineHeight: 21 },
    avertBox: { backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.lg },
    avertTxt: { ...Type.body, color: t.text, lineHeight: 22 },
    footer: { padding: Spacing.xl, paddingTop: Spacing.sm, backgroundColor: t.bg, borderTopWidth: Trait.fin, borderTopColor: t.line, gap: Spacing.md },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center' },
  });
}
