import React, { useEffect, useMemo, useRef } from 'react';
import { Modal, View, Text, StyleSheet, Animated, ScrollView, Easing } from 'react-native';
import { RESSORT, DUREE, ressortRN, ressortReduit, dureeReduite } from '../lib/motion';
import { reduceMotionActif } from '../lib/reduceMotion';
import { useTheme, Radius, Spacing, Type, ThemePalette, Trait , Icone } from '../constants/theme';
import { PrimaryButton, SectionLabel } from './ui';
import { goalLabel } from '../lib/tdee';
import { Meal, UserProfile } from '../lib/types';
import { DISCLAIMER } from '../constants/legal';
import { ReussiteIcon, IconeRepas } from './Icons';

import { knownSlots, slotIconType, slotLabel, slotOrFallback } from '../lib/mealSlots';

interface Props {
  visible: boolean;
  profile: UserProfile;
  firstName: string;
  previewMeals: Meal[];       // aperçu (repas du jour 1), affichés en concret
  onClose: () => void;
}

/**
 * Reveal du 1er plan (J1) : moment de révélation après l'onboarding. Met en avant
 * ce qui est NOUVEAU — la vraie semaine de repas calée sur les cibles — et absorbe
 * le récap + le disclaimer (l'étape « récap » de l'onboarding a été supprimée,
 * redondante).
 * Affiché UNE seule fois (flag `@kyroz:firstPlanSeen`), puis laisse place à la visite guidée.
 *
 * ⚠️ **Sa fermeture enchaîne sur `ReminderOffer`** (« un rappel par jour ? »), et
 * c'est le seul endroit d'où le rappel quotidien est proposé. Cette carte est le
 * premier instant où la valeur est livrée — donc le seul moment défendable pour
 * déclencher un prompt de permission, qui ne se pose qu'une fois.
 * *(Ce préambule disait « le RAPPEL QUOTIDIEN vit uniquement dans le Profil →
 * Réglages ». C'était vrai, et c'était le défaut : personne n'y allait.)*
 */
export function FirstPlanReveal({ visible, profile, firstName, previewMeals, onClose }: Props) {
  const t = useTheme();
  const s = makeStyles(t);
  // Lus du PROFIL passé en propriété, et non du contexte : ce composant s'affiche
  // juste après l'onboarding, sur le profil qu'on vient d'enregistrer.
  const slots = useMemo(() => knownSlots(profile), [profile]);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.9);
      opacity.setValue(0);
      const reduire = reduceMotionActif();
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          ...ressortRN(ressortReduit(RESSORT.fete, reduire)),
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: dureeReduite(DUREE.moyen, reduire),
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // 🔴 TOUT HOOK DE CE FICHIER VA AU-DESSUS DE CE `return null`, JAMAIS EN DESSOUS.
  // La leçon a été payée par le `useMemo` qui vivait ici (retiré le 2026-08-27 avec la
  // phrase qu'il choisissait) : posé plus bas, il n'existait qu'aux rendus VISIBLES →
  // « Rendered more hooks than during the previous render », et l'écran de bienvenue
  // tombait dans l'ErrorBoundary. Ni `tsc` ni les tests ne l'ont vu ; seul le rendu le
  // montre. La règle survit à ce qui l'a apprise — c'est pour ça qu'elle reste écrite.
  if (!visible) return null;

  return (
    // 🔴 `animationType="none"` — la `Modal` fondait DÉJÀ (`"fade"`) pendant que
    // la carte animait sa propre opacité : deux fondus superposés de durées
    // différentes sur le même objet. `Sheet` et `ActionSheet` étaient corrects
    // depuis toujours ; le défaut ne touchait que les trois célébrations, et il
    // ne se voit pas en lisant un diff — il se voit à l'écran, comme un départ
    // qui traîne.
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={s.root}>
        <Animated.View style={[s.card, { opacity, transform: [{ scale }] }]}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            <ReussiteIcon color={t.accent} size={Icone.fete} />
            <Text style={s.title}>C'est prêt{firstName ? `, ${firstName}` : ''} !</Text>
            {/* 🔴 UNE SEULE PHRASE DEPUIS LE 2026-08-27 (décision fondateur, sur capture :
                « je veux que la phrase soit juste ta semaine est calée sur ton objectif »).
                Elle en portait DEUX, choisies par un prédicat `modulé` — retiré avec elles.
                ⚠️ CE QUE LA NUANCE DISAIT, ET QUI N'EST PLUS DIT NULLE PART SUR CET ÉCRAN.
                Depuis la répartition par volume (2026-08-06), aucune journée ne vaut
                exactement `target_kcal` quand des séances sont déclarées : un jour
                d'entraînement vise plus haut, un jour de repos plus bas. La colonne
                s'appelait « kcal en moyenne », raccourcie en « kcal » le 2026-08-12 —
                et le mot « moyenne » avait alors DÉMÉNAGÉ dans cette phrase plutôt que
                de disparaître, pour que le premier écran de la relation n'annonce pas un
                nombre que le plan juste en dessous contredit (CLAUDE.md §10).
                ➡️ Le nombre affiché reste une MOYENNE hebdomadaire pour qui déclare des
                séances. Si ça doit se redire, ça se redira ailleurs — pas ici. */}
            <Text style={s.sub}>Ta semaine est calée sur ton objectif.</Text>

            {/* Libellé AU-DESSUS de la valeur (2026-08-12, décision fondateur). Ce n'est
                pas qu'une préférence : en dessous, il fallait réserver deux lignes de
                hauteur à la valeur (`minHeight: 38`) pour que les trois libellés
                s'alignent quand « Recomposition » passait sur deux lignes — d'où le gros
                trou sous les colonnes à une seule ligne. Au-dessus, les libellés font
                tous une ligne et s'alignent d'eux-mêmes : la béquille disparaît avec la
                cause. */}
            <View style={s.statRow}>
              {/* 1,8 et pas 1,4 : MESURÉ à l'écran, « Recomposition » se coupait encore
                  en « Recompositio / n » à 1,4. Un mot cassé en deux au milieu, c'est ce
                  qu'on corrige ici — un retour à la ligne entre deux MOTS (« Prise de
                  masse / propre ») est normal et reste acceptable. */}
              <Stat t={t} value={goalLabel(profile.goal)} label="Objectif" flex={1.8} />
              <Stat t={t} value={`${profile.target_kcal}`} label="kcal" />
              <Stat t={t} value={`${profile.plan_days}`} label={`jour${profile.plan_days > 1 ? 's' : ''}`} />
            </View>

            {previewMeals.length > 0 && (
              <View style={s.section}>
                <SectionLabel t={t}>Un aperçu de ta semaine</SectionLabel>
                <View style={{ gap: Spacing.md }}>
                  {previewMeals.map((m) => (
                    <View key={m.id} style={s.mealRow}>
                      <IconeRepas type={slotIconType(slotOrFallback(slots, m.meal_type))} color={t.textSecondary} size={Icone.standard} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.mealType}>{slotLabel(slots, m.meal_type)}</Text>
                        <Text style={s.mealName} numberOfLines={1}>{m.recipe.name_fr}</Text>
                      </View>
                      <Text style={s.mealKcal}>{Math.round(m.macros.kcal)} kcal</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 18 }} />
            {/* 🔴 `alignSelf: 'stretch'` — SANS LUI LE BOUTON RÉTRÉCIT SUR SON TEXTE.
                Le conteneur de cet écran est en `alignItems: 'center'` (cf. `s.scroll`),
                et `PrimaryButton` ne pose aucune largeur ni padding horizontal : il
                sortait donc en petit pavé collé à son libellé, là où tous les autres
                boutons principaux de l'app sont pleine largeur. Les deux blocs voisins
                (`statRow`, `section`) portaient déjà cette contre-mesure — celui-ci
                avait été oublié. Vu sur capture, pas en relisant le fichier.
                ⚠️ La correction est LOCALE à dessein : poser la largeur dans
                `PrimaryButton` toucherait ses dizaines d'appelants d'un coup, dont
                aucun n'a été regardé. */}
            <View style={{ alignSelf: 'stretch' }}>
              <PrimaryButton t={t} label="Voir mon plan" onPress={onClose} />
            </View>

            <Text style={s.disclaimer}>{DISCLAIMER}</Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Stat({ t, value, label, flex = 1 }: { t: ThemePalette; value: string; label: string; flex?: number }) {
  // ⚠️ `flex` n'est pas un réglage esthétique : les trois colonnes ne portent pas la
  // même chose. Deux tiennent un NOMBRE (« 2659 », « 7 »), la première un MOT qui va
  // jusqu'à « Prise de masse propre ». À largeurs égales, « Recomposition » se coupait
  // en « Recompositi / on » — une césure au milieu d'un mot, sur le premier écran.
  return (
    <View style={{ alignItems: 'center', flex }}>
      <Text style={{ ...Type.microStrong, color: t.textTertiary, textAlign: 'center' }}>{label}</Text>
      <Text
        style={{ ...Type.label, color: t.text, letterSpacing: -0.3, lineHeight: 19, marginTop: Spacing.xs, textAlign: 'center' }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: Spacing.xl },
    card: { width: '100%', maxWidth: 400, maxHeight: '88%', backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.xl },
    scroll: { padding: Spacing.xxl, alignItems: 'center' },
    emoji: { fontSize: 48, marginBottom: Spacing.sm },
    title: { color: t.text, ...Type.h2, textAlign: 'center' },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20, textAlign: 'center', marginTop: Spacing.sm, alignSelf: 'stretch' },
    // `alignItems: flex-start` → les trois libellés sont sur la même ligne, et une
    // valeur qui passe sur deux lignes descend toute seule sans pousser ses voisines.
    // Les espaces sont resserrés (xl → lg, lg → md) : le trou d'avant venait surtout
    // de la hauteur réservée sous les valeurs, plus de la marge du bloc.
    statRow: { flexDirection: 'row', alignItems: 'flex-start', alignSelf: 'stretch', gap: Spacing.sm, marginTop: Spacing.lg, paddingVertical: Spacing.md, borderTopWidth: Trait.fin, borderBottomWidth: Trait.fin, borderColor: t.line },
    section: { alignSelf: 'stretch', marginTop: Spacing.xl, gap: Spacing.md },
    mealRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    mealEmoji: { fontSize: 20 },
    mealType: { ...Type.microStrong, color: t.textTertiary },
    mealName: { ...Type.bodySmallStrong, color: t.text, marginTop: Spacing.xs },
    mealKcal: { ...Type.captionStrong, color: t.textSecondary },
    disclaimer: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center', marginTop: Spacing.xl },
  });
}
