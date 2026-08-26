import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Presse } from './Presse';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Type, Spacing, Trait, Icone, CIBLE_TACTILE_MIN, OPACITE_PRESSION } from '../constants/theme';
import {
  ShoppingTrip, ShoppingTripItem,
  newestFirst, boughtItems, skippedItems, tripHeadline, skippedNote,
} from '../lib/shoppingHistory';
import { frDateLongue } from '../lib/dateLabel';
import { formatQuantity } from '../lib/units';
import { ConfirmationEnLigne } from './ConfirmationEnLigne';

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
  const liste = useMemo(() => newestFirst(trips), [trips]);
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);

  // 🔴 LA CONFIRMATION VIT DANS LA FEUILLE, PLUS DANS UNE BOÎTE DE DIALOGUE —
  // corrigé le 2026-08-14 (fondateur : « retirer de l'historique ne fonctionne
  // pas »). `useDialog().confirm` monte sa propre `Modal` ; cet écran vit DÉJÀ
  // dans une `Modal` (la feuille qui l'affiche). Sur iOS, présenter une modale
  // par-dessus une modale en place ne donne rien — pas d'erreur, pas de trace :
  // le bouton s'exécutait, la promesse attendait une réponse que personne ne
  // pouvait donner, et l'écran ne bougeait pas.
  // ⚠️ CE DÉFAUT EST INVISIBLE SUR LE WEB : mesuré avant correctif, la
  // confirmation s'affichait et la sortie disparaissait. `react-native-web` rend
  // une `Modal` en `<div>` et empile sans se plaindre — c'est même pour ça que
  // `DialogProvider` monte sa boîte à la demande (CLAUDE.md §11). Ce contournement
  // règle l'ordre du DOM ; il ne règle pas l'empilement natif.
  // ➡️ Même famille que la fiche recette et son éditeur (`recettes.tsx`). Ici on
  // ne peut pas « remplacer » le contenu : la question porte sur UNE ligne, donc
  // elle se pose SUR cette ligne. Deux boutons, pas de modale.

  return (
    <View style={s.wrap}>
      <View {...(dragHandlers ?? {})}>
        <Text style={s.title}>Mes courses passées</Text>
        {/* ⚠️ UNE SEULE PHRASE depuis le 2026-08-14 (décision fondateur). La
            seconde — « Pratique pour retrouver ce que tu avais pris la dernière
            fois » — expliquait à quoi sert un écran qui s'explique tout seul :
            son titre le dit, et les cartes datées en dessous le montrent. */}
        <Text style={s.sub}>Chaque liste terminée s'archive ici.</Text>
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
                <Presse
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
                </Presse>

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

                    {aConfirmer === tr.at ? (
                      <ConfirmationEnLigne
                        t={t}
                        question="Retirer ces courses de l'historique ? Ta réserve n'y touche pas — seule la trace disparaît."
                        confirmLabel="Retirer"
                        onCancel={() => setAConfirmer(null)}
                        onConfirm={() => { setAConfirmer(null); onRemove(tr.at); }}
                      />
                    ) : (
                      <Presse
                        style={s.retirer}
                        onPress={() => setAConfirmer(tr.at)}
                        activeOpacity={OPACITE_PRESSION}
                        accessibilityRole="button"
                      >
                        <Ionicons name="trash-outline" size={Icone.petite} color={t.textTertiary} />
                        <Text style={s.retirerTxt}>Retirer de l'historique</Text>
                      </Presse>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* ⚠️ LE PIED DE PAGE A ÉTÉ RETIRÉ le 2026-08-14 (décision fondateur). Il
          disait deux choses vraies — l'historique reste sur l'appareil, et les
          listes de plus de six mois s'effacent seules — mais aucune n'est
          OBLIGATOIRE ici : le local-only est déclaré dans la politique de
          confidentialité (`constants/legal.ts` §, et son miroir `public/legal.html`),
          qui est la surface que la conformité regarde. Ce n'est pas l'avertissement
          médical de CLAUDE.md §6, qui, lui, ne se retire d'aucun écran.
          🔴 Le comportement, lui, N'A PAS CHANGÉ : la purge à six mois vit dans
          `lib/shoppingHistory.ts` et continue de tourner. Ne pas en déduire, en
          relisant cet écran, qu'elle a disparu avec sa phrase. */}
    </View>
  );
}

function Ligne({ s, item, pale }: { s: ReturnType<typeof makeStyles>; item: ShoppingTripItem; pale?: boolean }) {
  return (
    <View style={s.ligne}>
      <Text style={[s.nom, pale && s.pale]} numberOfLines={1}>{item.name}</Text>
      {/* Une sortie peut contenir un article AJOUTÉ À LA MAIN sans quantité
          (« café ») : `formatQuantity` rendrait « 0 g » — un chiffre inventé,
          relu six mois plus tard comme s'il avait été mesuré ce jour-là. */}
      {item.quantity > 0 && (
        <Text style={[s.qte, pale && s.pale]}>{formatQuantity(item.name, item.quantity, item.unit)}</Text>
      )}
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
  });
}
