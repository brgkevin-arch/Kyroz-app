import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { ThemePalette, Type, Spacing } from '../constants/theme';
import { PrimaryButton, SectionLabel } from './ui';
import { Wheel, BandeSelection, HAUTEUR_ROULETTE } from './Wheel';
import {
  MOIS_FR, joursDansMois, anneesPossibles, clampJour, decouper, ancrage, assembler,
} from '../lib/wheelDate';

// ── La roulette de date de naissance (contenu d'une feuille) ────────────────
//
// 🔴 RIEN N'EST ÉCRIT TANT QUE « VALIDER » N'EST PAS PRESSÉ, et c'est la décision
// structurante de cet écran. Une roulette affiche TOUJOURS quelque chose : posée
// en ligne dans le formulaire, elle montrerait une date que personne n'a choisie.
// Deux issues, toutes deux fausses :
//   · l'enregistrer d'office → un profil part avec un âge inventé, donc un BMR
//     faux, donc des calories fausses, sans qu'aucun écran ne le dise ;
//   · l'afficher sans l'enregistrer → l'écran montre une date que le moteur
//     n'a pas (CLAUDE.md §10, « un chiffre affiché est celui qui sera servi »).
// ➡️ D'où la feuille : ce qui est à l'écran ici est une PROPOSITION, et la ligne
// du formulaire derrière continue de dire « À renseigner » tant qu'on n'a pas
// validé. Le bouton « Continuer » de l'onboarding reste donc atténué, exactement
// comme avec les trois champs vides d'avant.
//
// ⚠️ Ça coûte un tap de plus qu'un champ en ligne. C'est le prix de l'honnêteté
// sur un champ qui alimente le moteur — et c'est le patron de toutes les autres
// feuilles de Kyroz.

interface Props {
  t: ThemePalette;
  /** Date déjà enregistrée ('YYYY-MM-DD'), ou `undefined`. */
  value?: string;
  /** Année du jour — passée depuis l'appelant, jamais lue ici (`todayStamp`). */
  anneeCourante: number;
  onValider: (stamp: string) => void;
  dragHandlers?: any;
}

export function BirthDatePicker({ t, value, anneeCourante, onValider, dragHandlers }: Props) {
  const depart = decouper(value) ?? ancrage(anneeCourante);
  const [j, setJ] = useState(depart.j);
  const [m, setM] = useState(depart.m);
  const [a, setA] = useState(depart.a);

  // ⚠️ MÉMOÏSÉES : `Wheel` se resynchronise sur un changement de `value` OU
  // d'`options`. Un tableau reconstruit à chaque rendu ferait relancer un
  // défilement à chaque image — sous le doigt, pendant le geste.
  const jours = useMemo(
    () => Array.from({ length: joursDansMois(a, m) }, (_, i) => i + 1),
    [a, m],
  );
  const mois = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const annees = useMemo(() => anneesPossibles(anneeCourante), [anneeCourante]);

  // Changer de mois (ou d'année, pour février) RAMÈNE le jour dans le mois : le
  // 31 janvier devient le 28 février, pas une date qui n'existe pas.
  const majMois = (nm: number) => { setM(nm); setJ((v) => clampJour(v, a, nm)); };
  const majAnnee = (na: number) => { setA(na); setJ((v) => clampJour(v, na, m)); };

  return (
    <View style={{ gap: Spacing.lg }}>
      <View {...(dragHandlers ?? {})} style={{ gap: Spacing.xs }}>
        <Text style={{ ...Type.h2, color: t.text }}>Ta date de naissance</Text>
        <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18 }}>
          Elle sert à calculer ton métabolisme, et ton âge se mettra à jour tout seul.
        </Text>
      </View>

      <View>
        {/* 🔴 LA BANDE D'ABORD : elle est pleine, donc rendue après les colonnes
            elle recouvrirait le chiffre sélectionné — le seul qu'on regarde. */}
        <BandeSelection t={t} />
        <View style={{ flexDirection: 'row', height: HAUTEUR_ROULETTE }}>
          <Wheel t={t} nom="Jour" testID="wheel-jour" options={jours} value={clampJour(j, a, m)} onChange={setJ} />
          <Wheel t={t} nom="Mois" testID="wheel-mois" options={mois} value={m} onChange={majMois} libelle={(v) => MOIS_FR[v - 1]} />
          <Wheel t={t} nom="Année" testID="wheel-annee" options={annees} value={a} onChange={majAnnee} />
        </View>
      </View>

      {/* Le libellé de chaque colonne SOUS la roulette : au-dessus, il se lit
          comme la valeur choisie de la colonne d'à côté. */}
      <View style={{ flexDirection: 'row' }}>
        {['JOUR', 'MOIS', 'ANNÉE'].map((l) => (
          <View key={l} style={{ flex: 1, alignItems: 'center' }}>
            <SectionLabel t={t}>{l}</SectionLabel>
          </View>
        ))}
      </View>

      <PrimaryButton t={t} label="Valider" onPress={() => onValider(assembler({ j, m, a }))} />
    </View>
  );
}
