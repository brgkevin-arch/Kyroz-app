import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Type, Spacing, Radius, Trait, Icone, CIBLE_TACTILE_MIN } from '../constants/theme';
import { Presse } from './Presse';
import { ActionSheet } from './ActionSheet';
import { Intitule, PrimaryButton } from './ui';
import { Wheel, BandeSelection, HAUTEUR_ROULETTE } from './Wheel';
import {
  KILOS, DIXIEMES, CENTIMETRES, departPoids, departTaille,
  decouperPoids, assemblerPoids, lireTaille, libellePoids, libelleTaille,
  pourcentsGras, departGras, decouperGras, assemblerGras, libelleGras,
} from '../lib/roulettesMesure';
import type { Sex } from '../lib/types';

// ── Poids, taille ou % de masse grasse : une LIGNE qui ouvre une ROULETTE ────
//
// Décision fondateur du 2026-09-22 (« un carrousel de taille et poids »). C'étaient
// deux champs à taper. Même grammaire que la date de naissance juste au-dessus
// (`BirthDateField`) : la ligne dit ce qui est ENREGISTRÉ — « À renseigner » tant que
// rien ne l'est, jamais ce que la roulette proposerait —, la feuille propose, et
// « Valider » décide. Rien n'est émis pendant qu'on fait tourner.
// ➕ Le % de masse grasse l'a rejointe le 2026-10-26 (segment 2, P9 : « ici et au
// Profil ») : c'était le dernier chiffre du questionnaire tapé au clavier.
// ⚠️ Le cadre de la ligne copie `BirthDateField`, lui-même calé sur `ui.tsx::Field` :
// trois lignes empilées sur le même écran, une seule grammaire.
// 🔴 La roulette vit dans une feuille À SA HAUTEUR (`ActionSheet`, segment 2, P5) : à
// 94 % (`Sheet`), elle occupait le tiers du haut d'une feuille vide aux deux tiers.
// Décisions (bornes, découpage, libellés) : `lib/roulettesMesure.ts`, pur et testé.

type Mesure = 'poids' | 'taille' | 'gras';

const TITRE: Record<Mesure, string> = { poids: 'Ton poids', taille: 'Ta taille', gras: 'Ta masse grasse' };
const LABEL: Record<Mesure, string> = { poids: 'Poids', taille: 'Taille', gras: 'Ou ton % exact (si tu le connais)' };
const A_CHOISIR: Record<Mesure, string> = {
  poids: 'Choisir mon poids', taille: 'Choisir ma taille', gras: 'Choisir mon % de masse grasse',
};
// Le % est FACULTATIF (une silhouette suffit) : « À renseigner » y réclamerait une réponse.
const VIDE: Record<Mesure, string> = { poids: 'À renseigner', taille: 'À renseigner', gras: 'Choisir' };

interface Props {
  t: ThemePalette;
  mesure: Mesure;
  /** La saisie enregistrée (« 75.5 », « 180 »), ou '' tant que rien n'est validé. */
  value: string;
  onChange: (v: string) => void;
  /** Pour ouvrir la roulette près des valeurs courantes, jamais pour pré-remplir. */
  sex: Sex | null;
  /** Où la roulette s'ouvre quand `value` est vide (le % de la silhouette choisie). */
  depart?: number;
}

function libelle(mesure: Mesure, value: string, sex: Sex | null): string | null {
  if (mesure === 'poids') return libellePoids(value);
  if (mesure === 'taille') return libelleTaille(value);
  return sex ? libelleGras(value, sex) : null;
}

export function MesureField({ t, mesure, value, onChange, sex, depart }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const affiche = libelle(mesure, value, sex);

  return (
    <View style={{ gap: Spacing.sm }}>
      <Intitule t={t}>{LABEL[mesure]}</Intitule>
      <Presse
        onPress={() => setOuvert(true)}
        accessibilityRole="button"
        accessibilityLabel={affiche ? `${LABEL[mesure]} : ${affiche}` : A_CHOISIR[mesure]}
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
        <Text style={{ ...(affiche ? Type.h3 : Type.ligne), color: affiche ? t.text : t.textTertiary }}>{affiche ?? VIDE[mesure]}</Text>
        <Ionicons name="chevron-forward" size={Icone.standard} color={t.textTertiary} />
      </Presse>

      <ActionSheet visible={ouvert} onClose={() => setOuvert(false)} glissePoigneeSeule>
        <RouletteMesure
          t={t} mesure={mesure} value={value} sex={sex} depart={depart}
          onValider={(v) => { onChange(v); setOuvert(false); }}
        />
      </ActionSheet>
    </View>
  );
}

function RouletteMesure({ t, mesure, value, sex, depart, onValider }: {
  t: ThemePalette; mesure: Mesure; value: string; sex: Sex | null; depart?: number; onValider: (v: string) => void;
}) {
  const poids = decouperPoids(value);
  const [kilos, setKilos] = useState(poids?.kilos ?? departPoids(sex));
  const [dixieme, setDixieme] = useState(poids?.dixieme ?? 0);
  const [cm, setCm] = useState(lireTaille(value) ?? departTaille(sex));
  // Le % : ce qui est enregistré, sinon la silhouette choisie, sinon celle du milieu.
  const gras = sex ? decouperGras(value || (depart != null ? String(depart) : ''), sex) : null;
  const [pct, setPct] = useState(gras?.entier ?? departGras(sex));
  const [pctDixieme, setPctDixieme] = useState(gras?.dixieme ?? 0);
  // Deux colonnes de chiffres pour le poids et le %, une pour la taille : les marges suivent.
  const flexUnite = mesure === 'taille' ? 1 : 0.6;
  // Le % n'a de bornes que par genre : sans genre, rien à proposer (l'appelant le garantit).
  if (mesure === 'gras' && !sex) return null;

  const valider = () => {
    if (mesure === 'poids') return onValider(assemblerPoids(kilos, dixieme));
    if (mesure === 'taille') return onValider(String(cm));
    return onValider(assemblerGras(pct, pctDixieme, sex as Sex));
  };

  // ⚠️ Pas de marge propre : `ActionSheet` pose déjà la sienne (`Spacing.xxl` sur les
  // côtés, et l'écart entre ses enfants). En ajouter une la doublerait.
  return (
    <View style={{ gap: Spacing.lg }}>
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
          {mesure === 'poids' && (
            <>
              <Wheel t={t} nom="Kilos" testID="wheel-poids" options={KILOS} value={kilos} onChange={setKilos} />
              <Wheel t={t} nom="Dixièmes" testID="wheel-poids-dixieme" options={DIXIEMES} value={dixieme} onChange={setDixieme} libelle={(v) => `,${v}`} />
            </>
          )}
          {mesure === 'taille' && (
            <Wheel t={t} nom="Centimètres" testID="wheel-taille" options={CENTIMETRES} value={cm} onChange={setCm} />
          )}
          {mesure === 'gras' && sex && (
            <>
              <Wheel t={t} nom="Pourcents" testID="wheel-gras" options={pourcentsGras(sex)} value={pct} onChange={setPct} />
              <Wheel t={t} nom="Dixièmes" testID="wheel-gras-dixieme" options={DIXIEMES} value={pctDixieme} onChange={setPctDixieme} libelle={(v) => `,${v}`} />
            </>
          )}
          {/* L'unité, fixe, à droite des chiffres : elle ne tourne pas avec eux. */}
          <View style={{ flex: flexUnite, justifyContent: 'center', alignItems: 'flex-start' }}>
            <Text style={{ ...Type.h3, color: t.textSecondary }}>{mesure === 'poids' ? 'kg' : mesure === 'taille' ? 'cm' : '%'}</Text>
          </View>
        </View>
      </View>
      <PrimaryButton t={t} label="Valider" onPress={valider} />
    </View>
  );
}
