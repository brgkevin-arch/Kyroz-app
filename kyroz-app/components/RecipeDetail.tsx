import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Presse } from './Presse';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemePalette, Radius, Spacing, Type, cardShadow, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { PrimaryButton } from './ui';
import { useFavorites } from '../hooks/useFavorites';
import { formatQuantity } from '../lib/units';
import { mealFiberG, mealFiberFromIngredients } from '../lib/fiber';
import { Recipe, MealStatus, Macros, AdaptFlag } from '../lib/types';
import { OBJ_LABEL } from '../lib/recipeLabels';
import { FLAG_AUDIENCE } from '../lib/adaptRecipe';
import { DureeIcon, RepasIcon, AvertissementIcon, FibresIcon } from './Icons';

interface Props {
  recipe: Recipe;
  portions?: number;          // affiche le repas à l'échelle de sa portion
  adaptedIngredients?: { name: string; quantity_g: number; unit?: string }[]; // si fourni → affiché tel quel
  adaptedMacros?: Macros;     // si fourni → remplace recipe.macros_per_portion × portions
  adaptFlags?: AdaptFlag[];   // faisabilité ; on n'affiche que les flags « user »
  adaptGap?: Macros;          // atteint − cible (signé) → « +Xg » pour protein_below_target
  restrictionRelaxed?: boolean; // bandeau « régime non garanti »
  onClose: () => void;
  onCook?: () => void;        // si fourni, affiche « J'ai mangé / cuisiné »
  onSkip?: () => void;        // si fourni, affiche « Je l'ai sauté »
  onResetStatus?: () => void; // si fourni + statut posé, affiche « Annuler »
  status?: MealStatus;        // suivi d'adhésion (eaten/skipped) → état affiché
  onSwap?: () => void;        // si fourni, affiche « Remplacer ce repas »
  onDislike?: () => void;     // si fourni, affiche le bouton « j'aime pas » (👎) → masque + change
  onEdit?: () => void;        // si fourni, affiche le bouton « personnaliser »
  custom?: boolean;           // recette déjà personnalisée → badge
  dragHandlers?: any;         // injecté par <Sheet> : rend l'en-tête glissable
  sheetScrollProps?: any;     // injecté par <Sheet> : lie le défilement à la fermeture
}

export function RecipeDetail({ recipe, portions = 1, adaptedIngredients, adaptedMacros, adaptFlags, adaptGap, restrictionRelaxed, onClose, onCook, onSkip, onResetStatus, status, onSwap, onDislike, onEdit, custom, dragHandlers, sheetScrollProps }: Props) {
  const t = useTheme();
  const layout = useLayout();
  const s = useMemo(() => makeStyles(t, layout.isTablet), [t, layout.isTablet]);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(recipe.id);
  const f = portions;

  // Avertissements : seulement les flags « user » (les 'selection'/'dev' ne s'affichent
  // pas), protéines en priorité avec l'écart en grammes (« ~Xg sous ta cible »).
  const userFlags = (adaptFlags ?? []).filter((fl) => FLAG_AUDIENCE[fl] === 'user');
  const orderedFlags = [
    ...userFlags.filter((fl) => fl === 'protein_below_target'),
    ...userFlags.filter((fl) => fl !== 'protein_below_target'),
  ];
  const flagMsg = (fl: AdaptFlag): string => {
    if (fl === 'protein_below_target') {
      const miss = adaptGap ? Math.max(0, -Math.round(adaptGap.protein_g)) : 0;
      return miss > 0
        ? `~${miss} g de protéines sous ta cible — ajoute un side protéiné.`
        : 'Repas un peu pauvre en protéines.';
    }
    if (fl === 'under_target_kcal') return 'Repas un peu en dessous de ta cible.';
    if (fl === 'over_target_kcal') return 'Repas un peu au-dessus de ta cible.';
    return '';
  };

  // Valeurs adaptées (scaling par ingrédient) si fournies, sinon recette × portions.
  const macros = adaptedMacros ?? {
    kcal: Math.round(recipe.macros_per_portion.kcal * f),
    protein_g: Math.round(recipe.macros_per_portion.protein_g * f),
    carbs_g: Math.round(recipe.macros_per_portion.carbs_g * f),
    fat_g: Math.round(recipe.macros_per_portion.fat_g * f),
  };
  const ings = adaptedIngredients ?? recipe.ingredients.map((i) => ({ name: i.name, quantity_g: i.quantity_g * f, unit: i.unit }));

  return (
    <View style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} {...(sheetScrollProps ?? {})}>
        {/* ⚠️ LE TITRE A SA PROPRE LIGNE depuis le 2026-08-14 (décision fondateur :
            « j'aimerais que les noms de recettes prennent l'espace de gauche à
            droite »). Les quatre boutons ronds partageaient sa rangée : ils
            mangeaient 200 pt sur 390, donc le nom disposait d'à peine la moitié de
            la feuille. « Fromage blanc – muesli – kiwi – graines de courge »
            tombait sur CINQ lignes, et le catalogue est plein de noms à rallonge —
            le titre est ce qu'on lit en premier, il ne peut pas être la colonne la
            plus étroite de l'écran. Les boutons passent au-dessus, alignés à
            droite : la croix reste là où l'œil la cherche dans une feuille. */}
        <View style={s.header} {...(dragHandlers ?? {})}>
          <View style={s.headerBtns}>
            {onEdit && (
              <Presse onPress={onEdit} style={s.close} accessibilityLabel="Personnaliser cette recette">
                <Ionicons name="create-outline" size={Icone.standard} color={t.textSecondary} />
              </Presse>
            )}
            <Presse onPress={() => toggle(recipe.id)} style={s.close} accessibilityLabel="J'aime cette recette">
              <Ionicons name={fav ? 'heart' : 'heart-outline'} size={Icone.standard} color={fav ? t.text : t.textSecondary} />
            </Presse>
            {onDislike && (
              <Presse onPress={onDislike} style={s.close} accessibilityLabel="Je n'aime pas — changer">
                <Ionicons name="thumbs-down-outline" size={Icone.petite} color={t.textSecondary} />
              </Presse>
            )}
            <Presse onPress={onClose} style={s.close} accessibilityLabel="Fermer">
              <Ionicons name="close" size={Icone.standard} color={t.textSecondary} />
            </Presse>
          </View>
          <Text style={s.name}>{recipe.name_fr}</Text>
          {custom && (
            <View style={s.badge}>
              <Ionicons name="create" size={Icone.petite} color={t.textSecondary} />
              <Text style={s.badgeTxt}>Personnalisée</Text>
            </View>
          )}
        </View>

        <View style={s.meta}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <DureeIcon color={t.textSecondary} size={Icone.petite} />
            <Text style={s.metaTxt}>{recipe.prep_time_min} min</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <RepasIcon color={t.textSecondary} size={Icone.petite} />
            <Text style={s.metaTxt}>{f === 1 ? '1 portion' : `${f} portions`}</Text>
          </View>
        </View>

        {/* `recipe.sports` n'est plus affiché depuis le 2026-08-03 : il reste un
            diversifieur interne, pas une promesse (cf. lib/recipeLabels.ts). */}
        {recipe.objectives?.length ? (
          <View style={s.tagRow}>
            {recipe.objectives.map((o) => <Text key={o} style={s.tag}>{OBJ_LABEL[o]}</Text>)}
          </View>
        ) : null}

        {restrictionRelaxed && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm }}>
            <AvertissementIcon color={t.warning} size={Icone.petite} />
            <Text style={[s.warn, { flex: 1 }]}>Aucune recette adaptée à ton régime pour ce repas — option standard.</Text>
          </View>
        )}
        {orderedFlags.map((fl) => <Text key={fl} style={s.warn}>{flagMsg(fl)}</Text>)}

        <View style={[s.macros, cardShadow(t)]}>
          <Big t={t} v={macros.kcal} l="kcal" />
          <Big t={t} v={macros.protein_g} l="Protéines" u="g" />
          <Big t={t} v={macros.carbs_g} l="Glucides" u="g" />
          <Big t={t} v={macros.fat_g} l="Lipides" u="g" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <FibresIcon color={t.textTertiary} size={Icone.petite} />
          <Text style={[s.fiber, { flex: 1 }]}>~{adaptedIngredients ? mealFiberFromIngredients(adaptedIngredients) : mealFiberG(recipe, f)} g de fibres (estimé)</Text>
        </View>

        {recipe.why_fr && <Text style={s.why}>{recipe.why_fr}</Text>}

        {/* Ingrédients | préparation côte à côte sur tablette.
            C'est LE cas d'usage tablette énoncé par le fondateur — cuisiner avec
            la recette sous les yeux — et le seul écran qui mérite une mise en
            page à lui : côte à côte, on lit une quantité sans avoir à remonter
            l'étape qu'on est en train de faire. Sur téléphone, `cook` retombe en
            colonne avec le même espacement qu'avant : le rendu est inchangé. */}
        <View style={s.cook}>
          <View style={s.cookCol}>
            <Text style={s.section}>INGRÉDIENTS</Text>
            {ings.map((ing, i) => (
              <View key={i} style={s.ing}>
                <Text style={s.ingName}>{ing.name}</Text>
                <Text style={s.ingQty}>{formatQuantity(ing.name, ing.quantity_g, ing.unit ?? 'g')}</Text>
              </View>
            ))}
          </View>

          <View style={s.cookColWide}>
            <Text style={s.section}>PRÉPARATION</Text>
            {recipe.steps.map((step, i) => (
              <View key={i} style={s.step}>
                <View style={s.stepN}><Text style={s.stepNTxt}>{i + 1}</Text></View>
                <Text style={s.stepTxt}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Repas déjà suivi (mangé / sauté) → état + annulation */}
        {status && status !== 'planned' && (onResetStatus || onCook || onSkip) && (
          <View style={[s.statusBanner, { borderColor: t.line }]}>
            <Text style={s.statusTxt}>
              {status === 'eaten' ? '✓ Marqué comme mangé' : '⊘ Repas sauté — journée recalée'}
            </Text>
            {onResetStatus && (
              <Presse onPress={onResetStatus} hitSlop={8}>
                <Text style={s.statusUndo}>Annuler</Text>
              </Presse>
            )}
          </View>
        )}

        {(!status || status === 'planned') && (onSwap || onCook || onSkip) && (
          <View style={{ marginTop: Spacing.xxl, gap: Spacing.md }}>
            {onSwap && (
              <>
                <Presse onPress={onSwap} activeOpacity={OPACITE_PRESSION} style={s.swapBtn}>
                  <Ionicons name="swap-horizontal" size={Icone.standard} color={t.text} />
                  <Text style={s.swapTxt}>Remplacer ce repas</Text>
                </Presse>
                {/* Disclaimer assumé, pas un aveu de bug : un remplacement n'est pas
                    mémorisé (rien ne le distingue d'un repas proposé), donc une
                    régénération peut ramener le plat écarté. On le DIT, et on donne
                    l'action qui, elle, tient dans le temps — le 👎. Cf. AGENTS.md A26. */}
                <Text style={s.swapHint}>
                  Ce remplacement vaut pour ce plan. Si ce plat ne te plaît pas du tout, « je n'aime pas » l'écarte pour de bon.
                </Text>
              </>
            )}
            {onSkip && (
              <Presse onPress={onSkip} activeOpacity={OPACITE_PRESSION} style={s.swapBtn}>
                <Ionicons name="close-circle-outline" size={Icone.standard} color={t.text} />
                <Text style={s.swapTxt}>Je l'ai sauté</Text>
              </Presse>
            )}
            {onCook && <PrimaryButton t={t} label="J'ai mangé — retirer du frigo" onPress={onCook} />}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function Big({ t, v, l, u = '', c }: { t: ThemePalette; v: number; l: string; u?: string; c?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: Spacing.xs }}>
      <Text style={{ ...Type.h2, color: c ?? t.text }}>{v}{u}</Text>
      <Text style={{ ...Type.micro, color: t.textSecondary }}>{l}</Text>
    </View>
  );
}

function makeStyles(t: ThemePalette, isTablet: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    // `gap: Spacing.xl` reproduit l'espacement que les lignes tenaient du
    // contentContainer quand elles en étaient les enfants directs.
    cook: isTablet
      ? { flexDirection: 'row', gap: Spacing.xxxl, alignItems: 'flex-start' }
      : { gap: Spacing.xl },
    // ⚠️ `flex` seulement sur tablette : dans un conteneur en colonne à
    // l'intérieur d'un ScrollView, `flex: 1` écrase la hauteur du bloc.
    cookCol: isTablet ? { flex: 1, gap: Spacing.xl } : { gap: Spacing.xl },
    // Colonnes ÉGALES : donner plus de place à la préparation (essayé à 1,15)
    // ramenait la colonne ingrédients sous la largeur utile d'un iPhone, donc
    // rendait la ligne « nom … quantité » plus serrée sur iPad que sur
    // téléphone. Verrouillé par lib/__tests__/layout.test.ts.
    cookColWide: isTablet ? { flex: 1, gap: Spacing.xl } : { gap: Spacing.xl },
    content: { padding: Spacing.xxl, gap: Spacing.xl, paddingBottom: Spacing.xxxl },
    header: { gap: Spacing.sm },
    name: { color: t.text, ...Type.h2 },
    badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start', backgroundColor: t.fill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.pill },
    badgeTxt: { ...Type.microStrong, color: t.textSecondary },
    headerBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm },
    close: { width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center' },
    meta: { flexDirection: 'row', gap: Spacing.lg },
    metaTxt: { ...Type.bodySmall, color: t.textSecondary },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: -Spacing.sm },
    tag: { ...Type.microStrong, backgroundColor: t.fill, color: t.textSecondary, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radius.pill, overflow: 'hidden' },
    warn: { ...Type.caption, color: t.warning, marginTop: -Spacing.sm },
    why: { ...Type.bodySmall, color: t.textSecondary, fontStyle: 'italic', lineHeight: 20, marginTop: -Spacing.sm },
    macros: { flexDirection: 'row', backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg, justifyContent: 'space-around' },
    fiber: { ...Type.caption, color: t.textTertiary, marginTop: -Spacing.sm },
    section: { color: t.textTertiary, ...Type.overline },
    ing: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.md, borderBottomWidth: Trait.fin, borderBottomColor: t.line },
    ingName: { ...Type.body, color: t.text },
    ingQty: { ...Type.bodySmall, color: t.textSecondary },
    step: { flexDirection: 'row', gap: Spacing.lg, alignItems: 'flex-start' },
    stepN: { width: 28, height: 28, borderRadius: 14, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs },
    stepNTxt: { ...Type.captionStrong, color: t.text },
    stepTxt: { ...Type.body, flex: 1, color: t.textSecondary, lineHeight: 22 },
    // Bouton secondaire : un REMPLISSAGE, pas un liseré de 1,5 px. Le contour
    // doublait celui de la feuille et faisait de l'action secondaire l'objet le
    // plus dessiné de l'écran — c'est le même arbitrage que les puces de filtre.
    swapBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, borderRadius: Radius.button, backgroundColor: t.fill },
    swapTxt: { ...Type.label, color: t.text },
    swapHint: { ...Type.caption, color: t.textSecondary, lineHeight: 18, marginTop: -Spacing.xs, paddingHorizontal: Spacing.xs },
    statusBanner: { marginTop: Spacing.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg, borderRadius: Radius.card, borderWidth: Trait.fin },
    statusTxt: { ...Type.bodySmallStrong, flex: 1, color: t.textSecondary },
    statusUndo: { ...Type.bodySmallStrong, color: t.text },
  });
}
