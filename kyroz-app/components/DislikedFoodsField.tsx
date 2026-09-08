import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemePalette, Type, Spacing } from '../constants/theme';
import { Chip, Field, SectionLabel } from './ui';
import { getEffectiveRecipes } from '../lib/recipes';
import { foodKeywordMatches, normalizeFood } from '../lib/avoidance';

// 🔴 LES SEPT BULLES « COURANTES » SONT PARTIES (décision fondateur, 2026-09-08).
// Saumon, Thon, Œufs, Brocolis, Avocat, Quinoa, Patate douce s'affichaient en un tap.
// Elles SUGGÉRAIENT une liste là où il n'y a qu'une saisie : sept aliments arbitraires
// mis en avant sur les 125 du catalogue, qui occupaient deux rangées et laissaient croire
// que l'essentiel était proposé. La barre reste, et c'est elle qui répond à la question.
// ⚠️ Les mots DÉJÀ enregistrés ne disparaissent pas avec les bulles : ils tombent tous
// dans `custom` ci-dessous, donc restent affichés et retirables — un profil existant ne
// perd rien, et surtout rien ne s'efface en silence.

// Normalise un mot-clé saisi : trim + minuscules. Le moteur, lui, compare en normalisé
// (ligatures et accents aplatis) — on stocke donc la frappe de l'utilisateur telle
// qu'il l'a écrite, c'est `recipeContainsFood` qui fait le rapprochement.
const normalizeKw = (s: string): string => s.trim().toLowerCase();

/**
 * Éditeur « Aliments à éviter » : SAISIE LIBRE, et rien d’autre.
 *
 * ⚠️ Ce champ AFFICHE désormais ce qu'il attrape, et c'est le cœur du correctif du
 * 2026-08-02. Avant, un mot sans effet ne se voyait pas : mesuré sur les 123 refs du
 * catalogue, « arachide » et « crustacés » — les deux exemples que ce champ donnait
 * lui-même en placeholder — n'excluaient **aucune recette**. L'utilisateur croyait
 * s'être protégé. Un compteur qui dit « 29 recettes évitées » ou « aucun ingrédient
 * ne correspond » supprime ce mensonge silencieux.
 *
 * ⚠️ Ce n'est PAS une garantie allergène et le texte ne doit jamais le laisser croire :
 * le catalogue ignore les traces, la contamination croisée et la composition exacte des
 * produits industriels. Cf. `lib/avoidance.ts`.
 */
export function DislikedFoodsField({
  t, value, onChange,
}: { t: ThemePalette; value: string[]; onChange: (next: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const recipes = useMemo(() => getEffectiveRecipes(), []);
  const compte = useMemo(() => (kw: string) => foodKeywordMatches(recipes, kw), [recipes]);

  const toggle = (kw: string) =>
    onChange(value.includes(kw) ? value.filter((x) => x !== kw) : [...value, kw]);

  const add = () => {
    const kw = normalizeKw(draft);
    if (kw && !value.includes(kw)) onChange([...value, kw]);
    setDraft('');
  };

  // Tout ce qui est enregistré s'affiche : il n'y a plus de bulles pré-cochées dont il
  // faudrait distinguer les entrées libres.
  const custom = value;
  // Mots déjà enregistrés qui n'excluent RIEN : ils donnent une fausse sécurité.
  const inertes = value.filter((kw) => compte(kw) === 0);
  const brouillon = normalizeFood(draft);
  const compteBrouillon = brouillon ? compte(brouillon) : null;

  return (
    <>
      {/* L'exemple vit dans l'intertitre depuis que le champ n'a plus d'étiquette : il
          porte l'information que « (arachide, crustacés…) » donnait, sans empiler deux
          libellés sur un seul champ — et sans finir tronqué dans un placeholder. */}
      <SectionLabel t={t} sub="Arachide, crustacés, ou n’importe quel aliment.">Aliments à éviter</SectionLabel>
      {custom.length ? (
        <View style={styles.wrap}>
          {custom.map((kw) => (
            <Chip key={kw} t={t} label={`${kw}  ✕`} selected onPress={() => toggle(kw)} />
          ))}
        </View>
      ) : null}
      <Field
        t={t}
        // ⚠️ « AUTRE aliment » désignait les bulles — il n'y en a plus. Le mot serait
        // resté à renvoyer vers rien, et l'intertitre juste au-dessus dit déjà de quoi
        // il s'agit : deux étiquettes empilées pour un seul champ. Retirer des choix
        // périme les mots qui les DÉSIGNAIENT, pas seulement le code qui les affichait.
        value={draft}
        onChangeText={setDraft}
        placeholder="Tape un aliment, puis Entrée"
        returnKeyType="done"
        onSubmitEditing={add}
        blurOnSubmit={false}
      />
      {compteBrouillon !== null ? (
        <Text style={{ ...Type.caption, color: compteBrouillon === 0 ? t.textTertiary : t.textSecondary }}>
          {compteBrouillon === 0
            ? `Aucun ingrédient ne correspond à « ${draft.trim()} » : ce mot n'écartera aucune recette.`
            : `« ${draft.trim()} » écarte ${compteBrouillon} recette${compteBrouillon > 1 ? 's' : ''} du catalogue.`}
        </Text>
      ) : null}
      {inertes.length ? (
        <Text style={{ ...Type.caption, color: t.textTertiary }}>
          Sans effet, aucun ingrédient ne correspond : {inertes.join(', ')}.
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
});
