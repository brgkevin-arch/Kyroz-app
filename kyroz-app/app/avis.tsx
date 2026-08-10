import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Platform, Linking, KeyboardAvoidingView } from 'react-native';
import { Presse } from '../components/Presse';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useTheme, ThemePalette, Spacing, Type, Radius, Fond, Icone, Trait, OPACITE_PRESSION, CIBLE_TACTILE_MIN } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { PrimaryButton } from '../components/ui';
import { useDialog } from '../components/Dialog';
import {
  AVIS_MAX, AVIS_SUJETS, AvisSujet, SUPPORT_EMAIL, avisValide, lienAvis, mentionContexte,
} from '../lib/feedback';

// ── « Donner mon avis » — route racine /avis ─────────────────────────────────
//
// Remplace un « Aide & contact » qui AFFICHAIT une adresse e-mail : il fallait la
// recopier à la main, depuis un téléphone, pour signaler quoi que ce soit.
//
// 🔴 C'EST UNE ROUTE, PAS UNE FEUILLE, et ce n'est pas un détail de style. Elle
// s'ouvre depuis la feuille Réglages : une feuille par-dessus une feuille rejoue
// l'empilement dont l'ordre dépend du DOM (cf. `ActionSheet.tsx`, corrigé le
// 2026-08-09). Une route se pousse dans la pile de navigation et ne se dispute
// rien avec la feuille — à condition que celle-ci se FERME avant la poussée,
// sans quoi le nouvel écran naîtrait sous la modale. C'est `ReglagesSheet` qui
// s'en charge, et un commentaire l'y explique.
//
// ⚠️ Le contexte joint au message est AFFICHÉ, mot pour mot, au-dessus du bouton.
// La liste vient de la même fonction que ce qui part réellement (`lib/feedback.ts`)
// — deux listes divergeraient et la première à mentir serait celle qu'on montre.
export default function AvisScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const router = useRouter();
  const { notify } = useDialog();

  const [sujet, setSujet] = useState<AvisSujet>('bug');
  const [texte, setTexte] = useState('');

  const ctx = {
    version: Constants.expoConfig?.version ?? '1.0.0',
    plateforme: Platform.OS,
  };
  const envoyable = avisValide(texte);

  const envoyer = async () => {
    const url = lienAvis(texte, sujet, ctx);
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) {
      Linking.openURL(url);
      // On revient DÈS l'ouverture du client mail. Rester sur un écran de
      // formulaire pendant que la messagerie s'ouvre par-dessus donnerait, au
      // retour, l'impression que rien n'est parti — et l'utilisateur renverrait.
      router.back();
      return;
    }
    // ⚠️ Aucun client mail configuré : ça arrive sur un simulateur et sur le web.
    // On ne perd pas le texte et on ne fait pas la leçon — on donne l'adresse.
    notify({
      title: 'Pas de messagerie sur cet appareil',
      message: `Écris-nous directement à ${SUPPORT_EMAIL} — ton texte est resté à l'écran, tu peux le copier.`,
    });
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[s.header, layout.header]}>
        <Presse onPress={() => router.back()} hitSlop={10} activeOpacity={OPACITE_PRESSION}>
          <Ionicons name="chevron-back" size={Icone.nav} color={t.text} />
        </Presse>
        <Text style={s.headerTitle}>Donner mon avis</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[s.content, layout.content]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Ton : on remercie et on dit à quoi ça sert. Pas de « aidez-nous à
              nous améliorer » — une formule qui demande sans rien promettre. */}
          <Text style={s.intro}>
            Kyroz est fait par une seule personne, et chaque retour est lu. Dis ce qui coince, ce qui manque, ou ce qui t'a plu.
          </Text>

          <Text style={s.label}>De quoi s'agit-il ?</Text>
          <View style={s.sujets}>
            {AVIS_SUJETS.map((o) => {
              const on = sujet === o.id;
              return (
                <Presse
                  key={o.id}
                  onPress={() => setSujet(o.id)}
                  activeOpacity={OPACITE_PRESSION}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[s.sujet, { borderColor: on ? t.accent : t.line, borderWidth: on ? Trait.controle : Trait.fin }]}
                >
                  <Text style={[s.sujetTxt, { color: on ? t.text : t.textSecondary }]}>{o.label}</Text>
                </Presse>
              );
            })}
          </View>

          <Text style={s.label}>Ton message</Text>
          <TextInput
            style={s.zone}
            value={texte}
            onChangeText={setTexte}
            multiline
            textAlignVertical="top"
            maxLength={AVIS_MAX}
            placeholder="Ce que tu veux nous dire…"
            placeholderTextColor={t.textQuaternary}
          />
          {/* Le compteur n'apparaît qu'à l'approche du plafond : affiché en
              permanence, il transforme une invitation à écrire en examen. */}
          {texte.length > AVIS_MAX - 200 && (
            <Text style={s.compteur}>{AVIS_MAX - texte.length} caractères restants</Text>
          )}

          <Text style={s.contexte}>
            Joint à ton message : {mentionContexte(ctx)}. Rien d'autre — ni ton poids, ni ton objectif, ni tes plans.
          </Text>

          <PrimaryButton t={t} label="Envoyer" onPress={envoyer} disabled={!envoyable} />
          <Text style={s.note}>
            Ton message s'ouvre dans ta messagerie : tu le relis, et c'est toi qui l'envoies.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingHorizontal: Spacing.xl, paddingBottom: Spacing.md,
      minHeight: CIBLE_TACTILE_MIN,
    },
    headerTitle: { ...Type.h3, color: t.text },
    content: { paddingHorizontal: Spacing.xl, paddingBottom: Fond.ecran, gap: Spacing.lg },
    intro: { ...Type.body, color: t.textSecondary, lineHeight: 21 },
    label: { ...Type.captionStrong, color: t.textSecondary, marginTop: Spacing.sm },
    sujets: { flexDirection: 'row', gap: Spacing.sm },
    sujet: {
      flex: 1, alignItems: 'center', justifyContent: 'center',
      minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button, paddingHorizontal: Spacing.sm,
    },
    sujetTxt: { ...Type.bodySmallStrong, textAlign: 'center' },
    // `Type.input` ne descend jamais sous 16 : Safari iOS zoome de force sous ce
    // seuil, et les testeurs ouvrent Kyroz dans le navigateur de leur téléphone.
    zone: {
      ...Type.input, color: t.text, backgroundColor: t.card,
      borderRadius: Radius.button, borderWidth: Trait.fin, borderColor: t.line,
      padding: Spacing.lg, minHeight: 160, lineHeight: 22,
    },
    compteur: { ...Type.caption, color: t.textTertiary, textAlign: 'right', marginTop: -Spacing.sm },
    contexte: { ...Type.caption, color: t.textTertiary, lineHeight: 18 },
    note: { ...Type.caption, color: t.textTertiary, textAlign: 'center', marginTop: -Spacing.sm },
  });
}
