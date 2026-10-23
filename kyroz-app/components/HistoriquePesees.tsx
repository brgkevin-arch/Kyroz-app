import React, { useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Presse } from './Presse';
import { ConfirmationEnLigne } from './ConfirmationEnLigne';
import { ThemePalette, Radius, Spacing, Type, Trait, Icone } from '../constants/theme';
import { historiquePesees, WeightEntry } from '../lib/weight';
import { frnum } from '../lib/units';

// ── L'historique des pesées, dans sa feuille (2026-10-23) ─────────────────────
//
// Décision fondateur : « l'historique sera en haut à droite ». Il vivait en bas de
// l'onglet Poids, sous la courbe ; il s'ouvre désormais par un bouton rond en haut à
// droite de l'onglet (comme le bouton « liste » de la capture de référence).
//
// ⚠️ TOUTES les pesées, plus les dix dernières : `HISTORIQUE_MAX` bornait une liste
// posée SOUS la courbe, pour qu'elle ne mange pas l'écran. Dans sa feuille, elle ne
// gêne rien — et une pesée plus ancienne que la dixième ne pouvait plus se supprimer.
//
// 🔴 L'ÉCART EST NEUTRE, comme la pastille de la courbe (fondateur, 2026-10-23). Il
// était vert à la baisse et orange à la hausse, recopié de l'ancienne feuille : en
// prise de masse, +0,3 kg est un progrès, et l'app le peignait en couleur d'alerte.

interface Props {
  t: ThemePalette;
  entries: WeightEntry[];
  photos: Record<string, string | null | undefined>;
  onRemove: (date: string) => void;
  dragHandlers?: any;
  sheetScrollProps?: any;
}

const anneeCourante = () => new Date().getFullYear();
/** « 23 oct. », ou « 23 oct. 2025 » hors de l'année en cours : la liste remonte loin. */
const frDateCourte = (iso: string) => {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'short', ...(d.getFullYear() !== anneeCourante() ? { year: 'numeric' } : {}),
  });
};

export function HistoriquePesees({ t, entries, photos, onRemove, dragHandlers, sheetScrollProps }: Props) {
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const lignes = historiquePesees(entries, entries.length);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.tete} {...(dragHandlers ?? {})}>
        <Text style={{ color: t.text, ...Type.h2 }}>Historique</Text>
      </View>
      <ScrollView contentContainerStyle={s.contenu} showsVerticalScrollIndicator={false} {...(sheetScrollProps ?? {})}>
        {lignes.length === 0 ? (
          <Text style={{ ...Type.bodySmall, color: t.textSecondary }}>Aucune pesée enregistrée.</Text>
        ) : (
          <View style={[s.carte, { backgroundColor: t.card, borderColor: t.line }]}>
            {lignes.map((e, i) => {
              const d = e.delta;
              return (
                <View key={e.date} style={[s.ligne, i < lignes.length - 1 && { borderBottomWidth: Trait.fin, borderBottomColor: t.line }]}>
                  <View style={s.rangee}>
                    <Text style={[s.date, { color: t.textSecondary }]}>{frDateCourte(e.date)}</Text>
                    <Text style={[s.poids, { color: t.text }]}>{frnum(e.weight_kg)} kg</Text>
                    <Text style={[s.ecart, { color: d == null ? t.textTertiary : t.textSecondary }]}>
                      {d == null ? '—' : `${d > 0 ? '+' : ''}${frnum(d)}`}
                    </Text>
                    <Presse onPress={() => setAConfirmer(e.date)} hitSlop={8} style={s.suppr} accessibilityLabel="Supprimer cette pesée">
                      <Ionicons name="close" size={Icone.petite} color={t.textTertiary} />
                    </Presse>
                  </View>
                  {aConfirmer === e.date && (
                    <ConfirmationEnLigne
                      t={t}
                      question={`Supprimer cette pesée ? ${frDateCourte(e.date)} · ${frnum(e.weight_kg)} kg. Tes cibles se recalculent sur les pesées restantes.`}
                      confirmLabel="Supprimer"
                      onCancel={() => setAConfirmer(null)}
                      onConfirm={() => { setAConfirmer(null); onRemove(e.date); }}
                    />
                  )}
                  {e.note ? <Text style={[s.note, { color: t.textSecondary }]}>{e.note}</Text> : null}
                  {photos[e.date] ? <Image source={{ uri: photos[e.date]! }} style={[s.photo, { backgroundColor: t.fill }]} /> : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  tete: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.sm },
  contenu: { padding: Spacing.xxl, paddingTop: Spacing.md },
  carte: { borderRadius: Radius.card, borderWidth: Trait.fin, paddingHorizontal: Spacing.lg },
  ligne: { paddingVertical: Spacing.md },
  rangee: { flexDirection: 'row', alignItems: 'center' },
  date: { ...Type.bodySmall, flex: 1 },
  poids: { ...Type.bodyStrong, width: 80, textAlign: 'right' },
  ecart: { ...Type.bodySmallStrong, width: 56, textAlign: 'right' },
  suppr: { marginLeft: Spacing.md, padding: Spacing.xs },
  note: { ...Type.caption, lineHeight: 18, marginTop: Spacing.xs, fontStyle: 'italic' },
  photo: { width: 64, height: 84, borderRadius: Radius.sm, marginTop: Spacing.sm },
});
