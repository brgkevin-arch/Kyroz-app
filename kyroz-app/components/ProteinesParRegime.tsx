import React from 'react';
import { View } from 'react-native';
import { ThemePalette, Spacing } from '../constants/theme';
import { Chip, GrilleChoix, Intitule, SectionLabel } from './ui';
import { LIBELLE_SORTE, VALEUR_SORTE, regimeChoisi, sortesProposees } from '../lib/partsProteines';
import type { DietaryRestriction } from '../lib/types';

/**
 * Les protéines préférées, SELON LE RÉGIME (décision fondateur du 2026-09-19,
 * `docs/2026-09-19-decision-preferences-proteines.md`). Un seul composant pour l'inscription
 * et le Profil : deux listes écrites en dur avaient déjà divergé une fois (elles proposaient
 * « Végétal » et « Whey » à tout le monde, y compris à qui n'en recevra jamais).
 *
 * Ce qui est coché devient une part GARANTIE des déjeuners et dîners, pas une exclusion : la
 * phrase sous le titre le dit, pour qu'un « poulet » coché ne se lise pas comme « rien d'autre ».
 */
export function ProteinesParRegime({
  t, restrictions, valeurs, onChange, peuImporte, masquerSansRegime = false, intitule = 'capitales', grille = false,
}: {
  t: ThemePalette;
  restrictions: DietaryRestriction[];
  /** Valeurs enregistrées (`preferred_proteins`). */
  valeurs: string[];
  onChange: (valeurs: string[]) => void;
  /** La réponse « Peu importe », quand l'écran en exige une (l'inscription). */
  peuImporte?: { selected: boolean; onToggle: () => void };
  /** À l'inscription : rien tant que le régime n'est pas choisi. */
  masquerSansRegime?: boolean;
  /** À l'inscription : casse de phrase, et plus de phrase d'explication dessous
   *  (décision fondateur, 2026-09-22). Le Profil garde les capitales et l'explication. */
  intitule?: 'capitales' | 'phrase';
  /** À l'inscription : la grille rectangulaire (`ui.tsx::GrilleChoix`, 2026-09-22),
   *  « Peu importe » en case pleine largeur. Le Profil garde ses pastilles. */
  grille?: boolean;
}) {
  if (masquerSansRegime && !regimeChoisi(restrictions)) return null;
  const sortes = sortesProposees(restrictions);
  const basculer = (v: string) => onChange(valeurs.includes(v) ? valeurs.filter((x) => x !== v) : [...valeurs, v]);
  return (
    <>
      {intitule === 'phrase' ? (
        <Intitule t={t}>Protéines préférées</Intitule>
      ) : (
        <SectionLabel t={t} sub="Elles reviendront le plus souvent dans tes déjeuners et dîners. Les autres restent possibles.">
          Protéines préférées
        </SectionLabel>
      )}
      {grille ? (
        <GrilleChoix
          t={t}
          options={sortes.map((s) => ({ label: LIBELLE_SORTE[s], value: VALEUR_SORTE[s] }))}
          estChoisi={(v) => valeurs.includes(v)}
          onChoisir={basculer}
          pleineLargeur={peuImporte && { label: 'Peu importe', selected: peuImporte.selected, onPress: peuImporte.onToggle }}
        />
      ) : (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {sortes.map((s) => (
          <Chip
            key={s} t={t} label={LIBELLE_SORTE[s]} selected={valeurs.includes(VALEUR_SORTE[s])}
            onPress={() => basculer(VALEUR_SORTE[s])}
          />
        ))}
        {peuImporte && <Chip t={t} label="Peu importe" selected={peuImporte.selected} onPress={peuImporte.onToggle} />}
      </View>
      )}
    </>
  );
}
