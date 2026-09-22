import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Type, Spacing, Radius, Trait, Icone, CIBLE_TACTILE_MIN } from '../constants/theme';
import { Presse } from './Presse';
import { Sheet } from './Sheet';
import { Intitule, PrimaryButton } from './ui';
import { Wheel, BandeSelection, HAUTEUR_ROULETTE } from './Wheel';
import {
  KILOS, DIXIEMES, CENTIMETRES, departPoids, departTaille,
  decouperPoids, assemblerPoids, lireTaille, libellePoids, libelleTaille,
} from '../lib/roulettesMesure';
import type { Sex } from '../lib/types';

// ── Poids ou taille : une LIGNE qui ouvre une ROULETTE ───────────────────────
//
// Décision fondateur du 2026-09-22 (« un carrousel de taille et poids »). C'étaient
// deux champs à taper. Même grammaire que la date de naissance juste au-dessus
// (`BirthDateField`) : la ligne dit ce qui est ENREGISTRÉ — « À renseigner » tant que
// rien ne l'est, jamais ce que la roulette proposerait —, la feuille propose, et
// « Valider » décide. Rien n'est émis pendant qu'on fait tourner.
// ⚠️ Le cadre de la ligne copie `BirthDateField`, lui-même calé sur `ui.tsx::Field` :
// trois lignes empilées sur le même écran, une seule grammaire.
// Décisions (bornes, découpage, libellés) : `lib/roulettesMesure.ts`, pur et testé.

type Mesure = 'poids' | 'taille';

const TITRE: Record<Mesure, string> = { poids: 'Ton poids', taille: 'Ta taille' };
const LABEL: Record<Mesure, string> = { poids: 'Poids', taille: 'Taille' };
const A_CHOISIR: Record<Mesure, string> = { poids: 'Choisir mon poids', taille: 'Choisir ma taille' };

interface Props {
  t: ThemePalette;
  mesure: Mesure;
  /** La saisie enregistrée (« 75.5 », « 180 »), ou '' tant que rien n'est validé. */
  value: string;
  onChange: (v: string) => void;
  /** Pour ouvrir la roulette près des valeurs courantes, jamais pour pré-remplir. */
  sex: Sex | null;
}

export function MesureField({ t, mesure, value, onChange, sex }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const affiche = mesure === 'poids' ? libellePoids(value) : libelleTaille(value);

  return (
    <View style={{ gap: Spacing.sm }}>
      <Intitule t={t}>{LABEL[mesure]}</Intitule>
      <Presse
        onPress={() => setOuvert(true)}
        accessibilityRole="button"
        accessibilityLabel={affiche ? `${LABEL[mesure]} : ${affiche}` : A_CHOISIR[mesure]}
        testID={`ligne-${mesure}`}
        style={{
          minHeight: CIBLE_TACTILE_MIN,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg,
          backgroundColor: t.scheme === 'dark' ? t.fill : t.card,
          borderRadius: Radius.button,
          borderWidth: Trait.fin, borderColor: t.line,
        }}
      >
        <Text style={{ ...Type.h3, color: affiche ? t.text : t.textTertiary }}>{affiche ?? 'À renseigner'}</Text>
        <Ionicons name="chevron-forward" size={Icone.standard} color={t.textTertiary} />
      </Presse>

      <Sheet visible={ouvert} onClose={() => setOuvert(false)}>
        <RouletteMesure
          t={t} mesure={mesure} value={value} sex={sex}
          onValider={(v) => { onChange(v); setOuvert(false); }}
        />
      </Sheet>
    </View>
  );
}

function RouletteMesure({ t, mesure, value, sex, onValider }: {
  t: ThemePalette; mesure: Mesure; value: string; sex: Sex | null; onValider: (v: string) => void;
}) {
  const poids = decouperPoids(value);
  const [kilos, setKilos] = useState(poids?.kilos ?? departPoids(sex));
  const [dixieme, setDixieme] = useState(poids?.dixieme ?? 0);
  const [cm, setCm] = useState(lireTaille(value) ?? departTaille(sex));
  // Deux colonnes de chiffres pour le poids, une pour la taille : les marges suivent.
  const flexUnite = mesure === 'poids' ? 0.6 : 1;

  return (
    <View style={{ padding: Spacing.xxl, gap: Spacing.lg }}>
      <Text style={{ ...Type.h2, color: t.text }}>{TITRE[mesure]}</Text>
      <View>
        {/* 🔴 LA BANDE D'ABORD : rendue après les colonnes, elle recouvrirait le chiffre
            sélectionné (même règle que `BirthDatePicker`). */}
        <BandeSelection t={t} />
        <View style={{ flexDirection: 'row', height: HAUTEUR_ROULETTE }}>
          {/* Une marge à gauche AUSSI LARGE que la colonne de l'unité à droite : les
              chiffres tombent au centre de la feuille, au lieu d'être calés à gauche
              avec l'unité perdue au bord. */}
          <View style={{ flex: flexUnite }} />
          {mesure === 'poids' ? (
            <>
              <Wheel t={t} nom="Kilos" testID="wheel-poids" options={KILOS} value={kilos} onChange={setKilos} />
              <Wheel t={t} nom="Dixièmes" testID="wheel-poids-dixieme" options={DIXIEMES} value={dixieme} onChange={setDixieme} libelle={(v) => `,${v}`} />
            </>
          ) : (
            <Wheel t={t} nom="Centimètres" testID="wheel-taille" options={CENTIMETRES} value={cm} onChange={setCm} />
          )}
          {/* L'unité, fixe, à droite des chiffres : elle ne tourne pas avec eux. */}
          <View style={{ flex: flexUnite, justifyContent: 'center', alignItems: 'flex-start' }}>
            <Text style={{ ...Type.h3, color: t.textSecondary }}>{mesure === 'poids' ? 'kg' : 'cm'}</Text>
          </View>
        </View>
      </View>
      <PrimaryButton
        t={t} label="Valider"
        onPress={() => onValider(mesure === 'poids' ? assemblerPoids(kilos, dixieme) : String(cm))}
      />
    </View>
  );
}
