import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Type, Spacing, Radius, Trait, Icone, CIBLE_TACTILE_MIN } from '../constants/theme';
import { Presse } from './Presse';
import { Sheet } from './Sheet';
import { BirthDatePicker } from './BirthDatePicker';
import { libelleDate } from '../lib/wheelDate';
import { ageOn, BIRTH_YEAR_MIN } from '../lib/birthday';
import { todayStamp } from '../lib/weight';
import { MIN_AGE } from '../lib/safety';
import { DATE_IMPOSSIBLE } from '../lib/dateLabel';

// ── Saisie de la date de naissance ──────────────────────────────────────────
//
// Une LIGNE qui ouvre une ROULETTE (décision fondateur, 2026-08-12). C'étaient
// trois champs à taper (`DateInput`), qui restent en service pour l'échéance de
// l'objectif daté — ce fichier ne garde que ce qui est propre à une date de
// NAISSANCE : l'âge minimum, l'année aberrante, et le repli des comptes créés
// avant qu'on demande la date.
//
// ⚠️ CE QUE LA ROULETTE FAIT DISPARAÎTRE, et il ne faut pas le regretter : le
// « 31 février ». Une roulette ne propose que des jours qui existent dans le mois
// affiché, donc la phrase « cette date n'existe pas » n'a plus de chemin depuis
// la saisie. Le contrôle reste en place pour les valeurs VENUES D'AILLEURS (un
// profil tiré du cloud, un compte ancien) : ce n'est pas du code mort, c'est le
// même contrôle sur une autre porte.
//
// ⚠️ ET CE QU'ELLE FAIT DISPARAÎTRE AUSSI : le garde `emitted` de `DateInput` —
// le champ qui se vidait sous les doigts (CLAUDE.md §11). Il n'a plus lieu d'être
// ici parce que rien n'est émis pendant la manipulation : la feuille propose, le
// bouton « Valider » décide. Le garde vit toujours dans `DateInput`, pour
// l'échéance. ➡️ Ne pas conclure que le piège est réglé partout.

interface Props {
  t: ThemePalette;
  /** Date actuelle ('YYYY-MM-DD') ou undefined si jamais renseignée. */
  value?: string;
  /** `undefined` tant que rien n'a été validé. */
  onChange: (stamp: string | undefined) => void;
  /**
   * Âge enregistré des comptes créés AVANT la date de naissance : affiché en
   * repli tant qu'aucune date n'est saisie, pour que l'écran ne donne pas
   * l'impression d'avoir perdu l'information.
   */
  fallbackAge?: number;
}

export function BirthDateField({ t, value, onChange, fallbackAge }: Props) {
  const [ouvert, setOuvert] = useState(false);

  const today = todayStamp();
  const age = ageOn(value, today);
  // Une date enregistrée qui ne donne aucun âge lisible (naissance en 2030, ou en
  // 1800) : la roulette ne peut plus en produire, une donnée ancienne si.
  const impossible = value != null && age == null;
  const tropJeune = age != null && age < MIN_AGE;
  const anneeAberrante = value != null && parseInt(value.slice(0, 4), 10) < BIRTH_YEAR_MIN;

  const probleme = impossible || anneeAberrante
    ? DATE_IMPOSSIBLE
    : tropJeune ? `Kyroz est réservé aux ${MIN_AGE} ans et plus.` : null;
  // Repli des comptes sans date : on n'a rien à leur reprocher, ton neutre.
  const repli = !probleme && age == null && fallbackAge != null
    ? `Âge enregistré : ${fallbackAge} ans. Renseigne ta date de naissance pour qu’il se mette à jour tout seul.`
    : null;

  return (
    <View style={{ gap: Spacing.sm }}>
      {/* ⚠️ Le libellé, le cadre et le corps du texte copient `ui.tsx::Field` — cette
          ligne se tient à côté de « Poids » et « Taille » sur le même écran, et deux
          grammaires qui se touchent, c'est le défaut mesuré de la passe rayons
          (CLAUDE.md §8 : quatre objets, trois grammaires). */}
      <Text style={{ ...Type.captionStrong, color: t.textSecondary }}>Date de naissance</Text>

      <Presse
        onPress={() => setOuvert(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `Date de naissance : ${libelleDate(value)}` : 'Choisir ma date de naissance'}
        style={{
          minHeight: CIBLE_TACTILE_MIN,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
          backgroundColor: t.scheme === 'dark' ? t.fill : t.card,
          borderRadius: Radius.button,
          borderWidth: Trait.fin, borderColor: probleme ? t.warning : t.line,
        }}
      >
        {/* ⚠️ « À renseigner » et pas une date grisée : la ligne dit ce que le
            moteur A, jamais ce que la roulette PROPOSERAIT. */}
        <Text style={{ ...Type.h3, color: value ? t.text : t.textTertiary }}>
          {value ? libelleDate(value) : 'À renseigner'}
        </Text>
        <Ionicons name="chevron-forward" size={Icone.standard} color={t.textTertiary} />
      </Presse>

      {/* On ne parle QUE quand il y a quelque chose à dire : ce qui bloque, ou ce
          qui manque. Une saisie valide n'a pas besoin d'être commentée — l'âge
          reste lisible sur la ligne « Informations » du profil, donc une faute de
          frappe se voit toujours. (Ligne de réassurance retirée le 2026-08-02,
          décision fondateur.) */}
      {(probleme || repli) && (
        <Text style={{ ...Type.caption, color: probleme ? t.warning : t.textSecondary, lineHeight: 18 }}>
          {probleme ?? repli}
        </Text>
      )}

      <Sheet visible={ouvert} onClose={() => setOuvert(false)}>
        <BirthDatePicker
          t={t}
          value={value}
          anneeCourante={parseInt(today.slice(0, 4), 10)}
          onValider={(stamp) => { onChange(stamp); setOuvert(false); }}
        />
      </Sheet>
    </View>
  );
}
