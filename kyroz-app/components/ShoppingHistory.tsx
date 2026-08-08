import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Type, Spacing, Trait, Icone, CIBLE_TACTILE_MIN, OPACITE_PRESSION } from '../constants/theme';
import { useDialog } from './Dialog';
import {
  ShoppingTrip, ShoppingTripItem,
  newestFirst, boughtItems, skippedItems, tripHeadline, skippedNote,
} from '../lib/shoppingHistory';
import { frDateLongue } from '../lib/dateLabel';
import { formatQuantity } from '../lib/units';

// ── Historique des listes de courses ─────────────────────────────────────────
//
// CE QUE CET ÉCRAN N'EST PAS : un tableau de bord des courses. Pas de total, pas
// de moyenne, pas de « tu fais tes courses tous les 5,2 jours ». Le suivi affiché
// à l'utilisateur doit rassurer, jamais mettre la pression (CLAUDE.md §10) — et
// une cadence de courses transformée en indicateur est exactement le genre de
// chiffre qui met en retard quelqu'un qui ne l'était pas.
//
// Il répond à UNE question, celle qu'on se pose devant le rayon : « qu'est-ce que
// j'ai pris la dernière fois ? ». D'où l'accordéon : la date et le nombre
// d'articles se lisent d'un coup d'œil, le détail ne s'ouvre que si on le demande.
//
// ⚠️ Le bouton de suppression n'apparaît QUE dans le détail ouvert. Posé dans
// l'en-tête, il aurait partagé la même ligne que le geste d'ouverture — et le
// geste le plus courant aurait touché du doigt le geste irréversible.

export function ShoppingHistory({
  t, trips, onRemove, dragHandlers, sheetScrollProps,
}: {
  t: ThemePalette;
  trips: ShoppingTrip[];
  /** Retire une sortie par son HORODATAGE (jamais par son rang : la liste est inversée). */
  onRemove: (at: string) => void;
  dragHandlers?: any;
  sheetScrollProps?: any;     // injecté par <Sheet> : lie le défilement à la fermeture
}) {
  const s = useMemo(() => makeStyles(t), [t]);
  const { confirm } = useDialog();
  const liste = useMemo(() => newestFirst(trips), [trips]);
  const [ouverte, setOuverte] = useState<string | null>(null);

  // `Alert.alert` est un no-op sur react-native-web (CLAUDE.md §11) : un seul
  // chemin, web et natif.
  const demanderSuppression = async (tr: ShoppingTrip) => {
    const ok = await confirm({
      title: 'Retirer ces courses ?',
      message: `${frDateLongue(tr.date)} · ${tripHeadline(tr)}. Ton frigo n'y touche pas — seule la trace disparaît.`,
      confirmLabel: 'Retirer',
      destructive: true,
    });
    if (ok) onRemove(tr.at);
  };

  return (
    <View style={s.wrap}>
      <View {...(dragHandlers ?? {})}>
        <Text style={s.title}>Mes courses passées</Text>
        <Text style={s.sub}>
          Chaque liste terminée s'archive ici. Pratique pour retrouver ce que tu avais pris la dernière fois.
        </Text>
      </View>

      {liste.length === 0 ? (
        <View style={s.videCard}>
          <Text style={s.videTitre}>Rien pour l'instant</Text>
          <Text style={s.videTexte}>
            Quand tu appuies sur « Courses terminées » depuis l'onglet Courses, ta liste s'archive ici avec ce
            que tu as coché.
          </Text>
        </View>
      ) : (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} {...(sheetScrollProps ?? {})}>
          {liste.map((tr) => {
            const ouvert = ouverte === tr.at;
            const pris = boughtItems(tr);
            const laisses = skippedItems(tr);
            const note = skippedNote(tr);
            return (
              <View key={tr.at} style={s.card}>
                <TouchableOpacity
                  style={s.head}
                  onPress={() => setOuverte(ouvert ? null : tr.at)}
                  activeOpacity={OPACITE_PRESSION}
                  accessibilityRole="button"
                  accessibilityLabel={`${frDateLongue(tr.date)}, ${tripHeadline(tr)}${ouvert ? ' — replier' : ' — voir le détail'}`}
                >
                  <View style={s.headTexte}>
                    <Text style={s.date}>{frDateLongue(tr.date)}</Text>
                    {/* Les non-pris se disent ici et pas dans le détail : c'est
                        l'information qui explique pourquoi la liste suivante
                        n'était pas vide. */}
                    {note ? <Text style={s.note}>{note}</Text> : null}
                  </View>
                  <Text style={s.compte}>{tripHeadline(tr)}</Text>
                  <Ionicons name={ouvert ? 'chevron-up' : 'chevron-down'} size={Icone.standard} color={t.textTertiary} />
                </TouchableOpacity>

                {ouvert && (
                  <View style={s.detail}>
                    {pris.map((i) => <Ligne key={`p-${i.name}`} s={s} item={i} />)}

                    {laisses.length > 0 && (
                      <>
                        <Text style={s.groupe}>NON PRIS</Text>
                        {laisses.map((i) => <Ligne key={`l-${i.name}`} s={s} item={i} pale />)}
                      </>
                    )}

                    {/* ⚠️ « ce que ta liste demandait », pas « ce que tu as acheté » :
                        Kyroz ne sait pas qu'un paquet de 1 kg a été pris pour 700 g. */}
                    <Text style={s.precision}>Quantités demandées par ta liste ce jour-là.</Text>

                    <TouchableOpacity
                      style={s.retirer}
                      onPress={() => demanderSuppression(tr)}
                      activeOpacity={OPACITE_PRESSION}
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash-outline" size={Icone.petite} color={t.textTertiary} />
                      <Text style={s.retirerTxt}>Retirer de l'historique</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Text style={s.pied}>
        Gardé sur ton téléphone uniquement, jamais envoyé — comme tes photos de progression. Les listes de
        plus de six mois s'effacent toutes seules.
      </Text>
    </View>
  );
}

function Ligne({ s, item, pale }: { s: ReturnType<typeof makeStyles>; item: ShoppingTripItem; pale?: boolean }) {
  return (
    <View style={s.ligne}>
      <Text style={[s.nom, pale && s.pale]} numberOfLines={1}>{item.name}</Text>
      <Text style={[s.qte, pale && s.pale]}>{formatQuantity(item.name, item.quantity, item.unit)}</Text>
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
    card: { borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, overflow: 'hidden' },

    head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, minHeight: CIBLE_TACTILE_MIN },
    headTexte: { flex: 1 },
    date: { ...Type.bodyStrong, color: t.text },
    note: { ...Type.caption, color: t.textTertiary, marginTop: Spacing.xs },
    compte: { ...Type.bodySmall, color: t.textSecondary },

    detail: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
    ligne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    nom: { ...Type.bodySmall, flex: 1, color: t.text },
    qte: { ...Type.bodySmall, color: t.textSecondary },
    pale: { color: t.textQuaternary },
    groupe: { ...Type.overline, color: t.textTertiary, marginTop: Spacing.sm },
    precision: { ...Type.caption, color: t.textQuaternary, lineHeight: 17, marginTop: Spacing.sm },

    retirer: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button, backgroundColor: t.fill, marginTop: Spacing.sm,
    },
    retirerTxt: { ...Type.bodySmall, color: t.textSecondary },

    videCard: { borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.card, padding: Spacing.xl, gap: Spacing.sm },
    videTitre: { ...Type.label, color: t.text },
    videTexte: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    pied: { ...Type.caption, color: t.textQuaternary, lineHeight: 17 },
  });
}
