import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Presse } from './Presse';
import { ConfirmationEnLigne } from './ConfirmationEnLigne';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Type, Spacing, Trait, Icone } from '../constants/theme';
import { OffPlanEntry, describeOutcome, newestFirst } from '../lib/offPlanJournal';
import { frDateLongue } from '../lib/dateLabel';

// ── Historique des repas hors plan (E6, point 2) ─────────────────────────────
//
// ⚠️ CET ÉCRAN N'EST PAS UN COMPTEUR, et c'est la décision produit qui le tient
// debout. Une liste de dérapages avec un total en haut serait un carnet de
// fautes — exactement la charge mentale que le produit refuse (CLAUDE.md §10).
// Donc, dans l'ordre :
//  · aucun total, aucune moyenne, aucun « X écarts ce mois-ci » ;
//  · chaque ligne dit ce que le MOTEUR a fait de l'écart, pas ce que la personne
//    aurait dû faire ;
//  · et quand la décision d'adaptation n'a pas été observée, la ligne se tait au
//    lieu de supposer.
// Le message de fond est « le moteur a encaissé », pas « tu as dérapé ».

// Le formatage vivait ici, à l'abri des tests. Il est sorti dans `lib/dateLabel`
// quand l'historique des courses en a eu besoin — AVANT la copie, pas après (le
// `disclaimer` recopié dans sept fichiers a suffi comme démonstration, §8).
const frDate = frDateLongue;

export function OffPlanHistory({
  t, entries, onRemove, dragHandlers, sheetScrollProps,
}: {
  t: ThemePalette;
  entries: OffPlanEntry[];
  /** Retire une entrée par son rang dans la liste AFFICHÉE (récente d'abord). */
  onRemove: (index: number) => void;
  dragHandlers?: any;
  sheetScrollProps?: any;     // injecté par <Sheet> : lie le défilement à la fermeture
}) {
  const s = useMemo(() => makeStyles(t), [t]);
  const liste = useMemo(() => newestFirst(entries), [entries]);
  const [aConfirmer, setAConfirmer] = useState<number | null>(null);

  // 🔴 LA CONFIRMATION VIT DANS LA FEUILLE, PLUS DANS UNE BOÎTE DE DIALOGUE
  // (2026-08-14). `useDialog().confirm` monte sa propre `Modal` ; cet écran vit
  // déjà dans une feuille, donc dans une modale, et iOS refuse d'en présenter une
  // seconde par-dessus — sans erreur ni trace. Mesuré au simulateur sur le même
  // mécanisme (« Supprimer mon compte » : deux captures identiques à l'horloge
  // près). ⚠️ Invisible au navigateur, qui empile sans se plaindre.

  return (
    <View style={s.wrap}>
      <View {...(dragHandlers ?? {})}>
        <Text style={s.title}>Mes repas hors plan</Text>
        <Text style={s.sub}>
          Ce que tu as mangé en dehors du plan, et ce que Kyroz en a fait. Rien à en tirer d'autre : une
          journée ne fait pas ta semaine.
        </Text>
      </View>

      {liste.length === 0 ? (
        <View style={s.videCard}>
          <Text style={s.videTitre}>Rien pour l'instant</Text>
          <Text style={s.videTexte}>
            Quand tu déclares un repas hors plan depuis l'écran Plan, il s'inscrit ici avec les calories que
            tes repas suivants ont reprises.
          </Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} {...(sheetScrollProps ?? {})}>
          {liste.map((e, i) => {
            const phrase = describeOutcome(e);
            return (
              <View key={`${e.date}-${e.day}`} style={s.card}>
                <View style={s.head}>
                  <View style={s.headTexte}>
                    <Text style={s.date}>{frDate(e.date)}</Text>
                    {e.label ? <Text style={s.label} numberOfLines={2}>{e.label}</Text> : null}
                  </View>
                  <Text style={s.kcal}>+{e.kcal.toLocaleString('fr-FR')} kcal</Text>
                  <Presse
                    onPress={() => setAConfirmer(i)}
                    hitSlop={10}
                    accessibilityRole="button"
                    // « du ${date} » donnait « du Aujourd'hui » : le tiret évite
                    // d'avoir à accorder un article avec une date variable.
                    accessibilityLabel={`Retirer cette ligne — ${frDate(e.date)}`}
                  >
                    <Ionicons name="close" size={Icone.standard} color={t.textTertiary} />
                  </Presse>
                </View>
                {/* Décision inconnue (app quittée avant l'arbitrage) → on se tait.
                    Écrire « journée gardée » serait affirmer ce qu'on n'a pas vu. */}
                {phrase ? <Text style={s.outcome}>{phrase}</Text> : null}
                {aConfirmer === i && (
                  <ConfirmationEnLigne
                    t={t}
                    question={`Retirer cette ligne ? ${frDate(e.date)}${e.label ? ` · ${e.label}` : ''} · +${e.kcal} kcal. Ton plan ne change pas — seule la trace disparaît.`}
                    confirmLabel="Retirer"
                    onCancel={() => setAConfirmer(null)}
                    onConfirm={() => { setAConfirmer(null); onRemove(i); }}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Text style={s.note}>
        Gardé sur ton téléphone uniquement, jamais envoyé — comme tes photos de progression. Les lignes de
        plus de six mois s'effacent toutes seules.
      </Text>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    wrap: { padding: Spacing.xxl, gap: Spacing.lg, flex: 1 },
    title: { color: t.text, ...Type.h2 },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20, marginTop: Spacing.sm },
    scroll: { flex: 1 },
    scrollContent: { gap: Spacing.md, paddingBottom: Spacing.xs },
    card: { borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.sm },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md },
    headTexte: { flex: 1 },
    date: { ...Type.bodyStrong, color: t.text },
    label: { ...Type.caption, color: t.textSecondary, marginTop: Spacing.xs },
    kcal: { ...Type.bodyStrong, color: t.text },
    outcome: { ...Type.caption, color: t.textTertiary, lineHeight: 18 },
    videCard: { borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.xl, gap: Spacing.sm },
    videTitre: { ...Type.label, color: t.text },
    videTexte: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    note: { ...Type.caption, color: t.textTertiary, lineHeight: 17 },
  });
}
