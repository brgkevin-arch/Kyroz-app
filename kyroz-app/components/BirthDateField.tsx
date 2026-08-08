import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { ThemePalette, Type, Spacing } from '../constants/theme';
import { DateInput } from './DateInput';
import { ageOn, BIRTH_YEAR_MIN } from '../lib/birthday';
import { todayStamp } from '../lib/weight';
import { MIN_AGE } from '../lib/safety';

// ── Saisie de la date de naissance ──────────────────────────────────────────
//
// La mécanique des trois champs (et son garde anti-réécriture) vit dans
// `DateInput` depuis le 2026-08-07 — l'échéance de l'objectif daté a besoin du
// même champ, et ce garde ne doit exister qu'à un seul endroit. Ce fichier ne
// garde que ce qui est propre à une date de NAISSANCE : l'âge minimum, l'année
// aberrante, et le repli des comptes créés avant qu'on demande la date.
//
// Le composant ne rend une date que si elle EXISTE vraiment : « 31/02 » ne
// produit rien. Il ne commente PAS une saisie valide — l'âge reste lisible sur la
// ligne « Informations » du profil, donc une faute de frappe se voit quand même.
// Il ne parle que pour ce qui bloque, ou ce qui manque.

interface Props {
  t: ThemePalette;
  /** Date actuelle ('YYYY-MM-DD') ou undefined si jamais renseignée. */
  value?: string;
  /** `undefined` tant que la saisie est incomplète ou invalide. */
  onChange: (stamp: string | undefined) => void;
  /**
   * Âge enregistré des comptes créés AVANT la date de naissance : affiché en
   * repli tant qu'aucune date n'est saisie, pour que l'écran ne donne pas
   * l'impression d'avoir perdu l'information.
   */
  fallbackAge?: number;
}

export function BirthDateField({ t, value, onChange, fallbackAge }: Props) {
  // « Saisie complète » vient du champ, et c'est ce qui distingue « il manque le
  // mois » (on se taît) de « le 31 février n'existe pas » (on le dit). Une date
  // déjà enregistrée est complète par construction.
  const [complete, setComplete] = useState(value != null);

  const today = todayStamp();
  const age = ageOn(value, today);
  // Saisie complète mais date inexploitable → on le dit au lieu de laisser un champ
  // silencieusement sans effet. Le test porte sur l'ÂGE et non sur la date : il attrape
  // à la fois le 31 février (aucun stamp produit) et la date qui existe sans donner
  // d'âge lisible — une naissance en 2030, ou en 1800.
  const impossible = complete && age == null;
  const tropJeune = age != null && age < MIN_AGE;
  // L'année se relit sur la date ÉMISE : une année à 4 chiffres qui produit une date
  // réelle est forcément en tête du stamp. Une saisie plus courte n'est pas complète,
  // donc on ne l'a jamais commentée.
  const anneeAberrante = value != null && parseInt(value.slice(0, 4), 10) < BIRTH_YEAR_MIN;

  return (
    <View style={{ gap: Spacing.sm }}>
      <DateInput
        t={t}
        value={value}
        placeholders={{ d: '2', mo: '8', y: '1994' }}
        onChange={(stamp, complet) => { setComplete(complet); onChange(stamp); }}
      />

      {/* On ne parle QUE quand il y a quelque chose à dire : ce qui bloque, ou ce
          qui manque. Une saisie valide n'a pas besoin d'être commentée — l'âge
          reste lisible sur la ligne « Informations » du profil, donc une faute de
          frappe se voit toujours. (Ligne de réassurance retirée le 2026-08-02,
          décision fondateur.) */}
      {(() => {
        const probleme = impossible || anneeAberrante
          ? 'Cette date n’existe pas — vérifie le jour et le mois.'
          : tropJeune ? `Kyroz est réservé aux ${MIN_AGE} ans et plus.` : null;
        // Repli des comptes sans date : on n'a rien à leur reprocher, ton neutre.
        const repli = !probleme && age == null && fallbackAge != null
          ? `Âge enregistré : ${fallbackAge} ans. Renseigne ta date de naissance pour qu’il se mette à jour tout seul.`
          : null;
        if (!probleme && !repli) return null;
        return (
          <Text style={{ ...Type.caption, color: probleme ? t.warning : t.textSecondary, lineHeight: 18 }}>
            {probleme ?? repli}
          </Text>
        );
      })()}
    </View>
  );
}
