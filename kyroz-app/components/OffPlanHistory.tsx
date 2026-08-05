import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Type } from '../constants/theme';
import { useDialog } from './Dialog';
import { OffPlanEntry, describeOutcome, newestFirst } from '../lib/offPlanJournal';
import { todayStamp } from '../lib/weight';

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

const frDate = (iso: string): string => {
  const today = todayStamp();
  if (iso === today) return "Aujourd'hui";
  const veille = new Date(today + 'T00:00:00');
  veille.setDate(veille.getDate() - 1);
  const hier = `${veille.getFullYear()}-${String(veille.getMonth() + 1).padStart(2, '0')}-${String(veille.getDate()).padStart(2, '0')}`;
  if (iso === hier) return 'Hier';
  const txt = new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  // ⚠️ Surtout PAS `textTransform: 'capitalize'` : il met une majuscule à chaque
  // mot et rend « Mardi 28 Juillet ». En français, seul le premier mot en prend une.
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

export function OffPlanHistory({
  t, entries, onRemove, dragHandlers,
}: {
  t: ThemePalette;
  entries: OffPlanEntry[];
  /** Retire une entrée par son rang dans la liste AFFICHÉE (récente d'abord). */
  onRemove: (index: number) => void;
  dragHandlers?: any;
}) {
  const s = useMemo(() => makeStyles(t), [t]);
  const { confirm } = useDialog();
  const liste = useMemo(() => newestFirst(entries), [entries]);

  // `Alert.alert` est un no-op sur react-native-web (CLAUDE.md §11) : un seul
  // chemin, web et natif.
  const demanderSuppression = async (index: number, e: OffPlanEntry) => {
    const ok = await confirm({
      title: 'Retirer cette ligne ?',
      message: `${frDate(e.date)}${e.label ? ` · ${e.label}` : ''} · +${e.kcal} kcal`,
      confirmLabel: 'Retirer',
      destructive: true,
    });
    if (ok) onRemove(index);
  };

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
          <Text style={s.videTitre}>Rien pour l'instant 😎</Text>
          <Text style={s.videTexte}>
            Quand tu déclares un repas hors plan depuis l'écran Plan, il s'inscrit ici avec les calories que
            tes repas suivants ont reprises.
          </Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
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
                  <TouchableOpacity
                    onPress={() => demanderSuppression(i, e)}
                    hitSlop={10}
                    accessibilityRole="button"
                    // « du ${date} » donnait « du Aujourd'hui » : le tiret évite
                    // d'avoir à accorder un article avec une date variable.
                    accessibilityLabel={`Retirer cette ligne — ${frDate(e.date)}`}
                  >
                    <Ionicons name="close" size={18} color={t.textQuaternary} />
                  </TouchableOpacity>
                </View>
                {/* Décision inconnue (app quittée avant l'arbitrage) → on se tait.
                    Écrire « journée gardée » serait affirmer ce qu'on n'a pas vu. */}
                {phrase ? <Text style={s.outcome}>{phrase}</Text> : null}
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
    wrap: { padding: 24, gap: 16, flex: 1 },
    title: { color: t.text, ...Type.h2 },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20, marginTop: 6 },
    scroll: { flex: 1 },
    scrollContent: { gap: 10, paddingBottom: 4 },
    card: { borderWidth: 1, borderColor: t.line, borderRadius: Radius.card, padding: 16, gap: 6 },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    headTexte: { flex: 1 },
    date: { ...Type.bodyStrong, color: t.text },
    label: { ...Type.caption, color: t.textSecondary, marginTop: 2 },
    kcal: { ...Type.bodyStrong, color: t.text },
    outcome: { ...Type.caption, color: t.textTertiary, lineHeight: 18 },
    videCard: { borderWidth: 1, borderColor: t.line, borderRadius: Radius.card, padding: 20, gap: 6 },
    videTitre: { ...Type.label, color: t.text },
    videTexte: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    note: { ...Type.caption, color: t.textQuaternary, lineHeight: 17 },
  });
}
