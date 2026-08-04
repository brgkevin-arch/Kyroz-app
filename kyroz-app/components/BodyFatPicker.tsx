import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { ThemePalette, Radius, Type } from '../constants/theme';
import { Field } from './ui';
import { Sex } from '../lib/types';
import { bodyFatBounds, bodyFatConcern, fatFreeMassKg } from '../lib/safety';
import { bodyFatTdeeImpact, TdeeBody } from '../lib/tdee';

// ── Sélecteur de masse grasse ────────────────────────────────────────────────
// 6 niveaux de corpulence (valeurs sexuées, calées sur les chartes visuelles de
// % de masse grasse) OU saisie manuelle du % exact si l'utilisateur le connaît.
// OBLIGATOIRE : l'onboarding bloque tant qu'aucune valeur n'est choisie (le TDEE
// précis repose dessus — Katch-McArdle plutôt que Mifflin).
//
// 6 rendus 3D détourés par sexe (assets/bodyfat), une image par niveau.

const IMAGES: Record<Sex, ImageSourcePropType[]> = {
  male: [
    require('../assets/bodyfat/male-1.png'),
    require('../assets/bodyfat/male-2.png'),
    require('../assets/bodyfat/male-3.png'),
    require('../assets/bodyfat/male-4.png'),
    require('../assets/bodyfat/male-5.png'),
    require('../assets/bodyfat/male-6.png'),
  ],
  female: [
    require('../assets/bodyfat/female-1.png'),
    require('../assets/bodyfat/female-2.png'),
    require('../assets/bodyfat/female-3.png'),
    require('../assets/bodyfat/female-4.png'),
    require('../assets/bodyfat/female-5.png'),
    require('../assets/bodyfat/female-6.png'),
  ],
};

type Level = { pct: number; label: string; desc: string };

const LEVELS: Record<Sex, Level[]> = {
  male: [
    { pct: 10, label: '~10 %', desc: 'Abdos très dessinés, sec' },
    { pct: 15, label: '~15 %', desc: 'Abdos visibles, athlétique' },
    { pct: 20, label: '~20 %', desc: 'Silhouette tonique' },
    { pct: 25, label: '~25 %', desc: 'Peu de définition' },
    { pct: 30, label: '~30 %', desc: 'Ventre rond, formes marquées' },
    { pct: 35, label: '~35 %', desc: 'Surpoids visible' },
  ],
  female: [
    { pct: 18, label: '~18 %', desc: 'Très athlétique, abdos visibles' },
    { pct: 23, label: '~23 %', desc: 'Tonique, galbe défini' },
    { pct: 28, label: '~28 %', desc: 'Silhouette équilibrée' },
    { pct: 33, label: '~33 %', desc: 'Formes plus marquées' },
    { pct: 38, label: '~38 %', desc: 'Rondeurs visibles' },
    { pct: 43, label: '~43 %', desc: 'Surpoids visible' },
  ],
};

interface Props {
  t: ThemePalette;
  sex: Sex;
  value?: number;
  onChange: (pct: number | undefined) => void;
  /**
   * Corps connu à cet instant (poids, taille, âge…), pour chiffrer ce qu'un %MG
   * atypique change sur la dépense estimée. Absent → le repère s'affiche sans le
   * chiffre : à l'onboarding, le poids peut ne pas être saisi.
   */
  body?: TdeeBody;
}

export function BodyFatPicker({ t, sex, value, onChange, body }: Props) {
  const levels = LEVELS[sex];
  // Bornes PAR SEXE : 3 % est sous le gras essentiel masculin et impossible chez
  // une femme (~12 % de gras essentiel). L'ancienne borne unique 3–60 était fausse.
  const [BF_MIN, BF_MAX] = bodyFatBounds(sex);

  // Texte LOCAL du champ « % exact ». On NE clampe pas le MIN pendant la frappe
  // (sinon taper « 23 » passe par « 2 » → clampé au minimum → « 33 »). Le
  // clamp MIN n'est appliqué qu'au blur. La synchro depuis `value` permet au tap
  // d'une silhouette (ou à « Effacer ») de remplir/vider le champ.
  const [pctText, setPctText] = useState(value != null ? String(value) : '');
  // ⚠️ TANT QUE LE CHAMP A LE FOCUS, `value` ne réécrit PAS le texte tapé.
  // C'est le mécanisme du bug « 23 → 33 », et retirer le clamp MIN ne l'avait
  // traité qu'à moitié : dès qu'UN clamp (min, max, ou le re-bornage au
  // changement de sexe) modifie `value` au milieu d'une frappe, cette synchro
  // remplace ce que l'utilisateur est en train d'écrire — le chiffre suivant
  // s'ajoute alors à une valeur qu'il n'a jamais tapée. Le champ n'est resynchro
  // que quand il n'a PAS le focus (tap d'une silhouette, « Effacer ») ; au blur,
  // `onBlur` ci-dessous écrit lui-même la valeur normalisée.
  const focused = React.useRef(false);
  useEffect(() => {
    if (focused.current) return;
    setPctText(value != null ? String(value) : '');
  }, [value]);

  // Le sexe est ÉDITABLE dans « Informations » : un %MG parfaitement valide chez
  // l'homme (10 %, première silhouette) est sous le gras essentiel féminin (12 %).
  // Sans re-borner au changement de sexe, on stockait une valeur hors borne
  // physiologique — précisément celle que P0.4 vient d'introduire — et elle
  // alimentait `leanBodyMass`/Katch-McArdle avant d'être affichée à l'utilisateur.
  useEffect(() => {
    if (value == null) return;
    const clamped = Math.min(Math.max(value, BF_MIN), BF_MAX);
    if (clamped !== value) onChange(clamped);
  }, [sex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deux repères, une seule source (`safety.bodyFatConcern`) : le %MG sous la charte
  // des silhouettes, et la masse maigre que ce %MG implique. Le second attrape ce que
  // le premier laisse passer — 20 % chez une femme de 80 kg / 1 m 70 ne franchit aucun
  // seuil plat, mais annonce 64 kg de masse maigre (FFMI 22,1), hors plafond féminin.
  const concern = bodyFatConcern(sex, value, body?.weight_kg ? { ...body } : undefined);

  // Chiffré sur la MAINTENANCE (cf. bodyFatTdeeImpact) : à l'étape 3 de l'onboarding,
  // ni l'objectif ni les séances ne sont connus, donc la cible n'existe pas encore.
  const impactKcal = (body && value != null && body.weight_kg > 0 && concern)
    ? bodyFatTdeeImpact({ ...body, sex }, value)
    : null;

  const leanKg = (body && value != null && body.weight_kg > 0)
    ? Math.round(fatFreeMassKg({ ...body, sex, body_fat_pct: value }))
    : null;

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.grid}>
        {levels.map((lv, i) => {
          const on = value === lv.pct;
          return (
            <TouchableOpacity
              key={lv.pct}
              activeOpacity={0.85}
              onPress={() => onChange(on ? undefined : lv.pct)}
              style={[
                styles.cell,
                { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line },
              ]}
            >
              <View style={styles.figure}>
                <Image
                  source={IMAGES[sex][i]}
                  style={[styles.img, on && { opacity: 0.9 }]}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.pct, { color: on ? t.onAccent : t.text }]}>{lv.label}</Text>
              <Text style={[styles.desc, { color: on ? t.onAccent : t.textSecondary }]}>{lv.desc}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Field
        t={t}
        label="Ou saisis ton % exact (si tu le connais)"
        suffix="%"
        keyboardType="decimal-pad"
        value={pctText}
        onFocus={() => { focused.current = true; }}
        onChangeText={(txt) => {
          setPctText(txt);
          if (!txt) return onChange(undefined);
          const n = parseFloat(txt.replace(',', '.'));
          if (Number.isNaN(n)) return;
          // Pendant la frappe : seul le clamp MAX (évite l'absurde) ; le MIN
          // est appliqué au blur pour ne pas casser la saisie progressive.
          onChange(Math.min(n, BF_MAX));
        }}
        // ⚠️ `onBlur` et NON `onEndEditing` : react-native-web ne câble PAS
        // onEndEditing (no-op sur le web déployé) — seul onBlur est appelé au blur.
        onBlur={() => {
          focused.current = false;
          if (!pctText) return;
          const n = parseFloat(pctText.replace(',', '.'));
          if (Number.isNaN(n)) { onChange(undefined); setPctText(''); return; }
          const clamped = Math.min(Math.max(n, BF_MIN), BF_MAX);
          onChange(clamped);
          setPctText(String(clamped));
        }}
        placeholder="ex. 18"
      />

      {/* Repères de plausibilité — cf. safety.bodyFatConcern. On informe, on ne bloque
          pas : ces valeurs existent, elles sont juste rarement exactes au jugé.
          ⚠️ `below_chart` ne peut venir que d'une saisie manuelle (son seuil EST la
          silhouette la plus maigre). `lean_mass`, lui, PEUT se lever sur un tap — et
          c'est voulu : taper « très athlétique » à 80 kg pour 1 m 70 annonce une masse
          maigre hors plafond, que ce soit tapé ou choisi ne change rien au chiffre. */}
      {concern && (
        <View style={[styles.note, { borderColor: t.warning, backgroundColor: t.card }]}>
          <Text style={{ ...Type.captionStrong, color: t.text, marginBottom: 2 }}>
            {concern === 'lean_mass' && leanKg != null
              ? `Ce chiffre annonce ${leanKg} kg de masse maigre`
              : `${value} %, c'est un niveau d'athlète de compétition`}
          </Text>
          <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 17 }}>
            {concern === 'lean_mass'
              ? `C'est au-dessus de ce que porte la quasi-totalité des ${sex === 'female' ? 'femmes' : 'hommes'} de ta taille. Kyroz calcule ta dépense sur cette masse${impactKcal != null && impactKcal > 0 ? `, et la relève de ${impactKcal} kcal/jour` : ''} — autant de déficit en moins si le % est trop bas. La silhouette la plus proche sera plus juste.`
              : impactKcal != null && impactKcal > 0
                ? `Ce chiffre relève ta dépense estimée de ${impactKcal} kcal/jour — autant de déficit en moins si tu te trompes. En cas de doute, la silhouette la plus proche sera plus juste.`
                : 'En cas de doute, la silhouette la plus proche sera plus juste : le moteur estime alors ta masse grasse, et une estimation vaut mieux qu\'un chiffre faux.'}
          </Text>
        </View>
      )}

      {value != null && (
        <TouchableOpacity onPress={() => onChange(undefined)} activeOpacity={0.7} style={styles.clear}>
          <Text style={{ ...Type.captionStrong, color: t.textTertiary }}>Effacer ma sélection</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderRadius: Radius.card,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
    alignItems: 'center',
  },
  figure: { height: 104, alignItems: 'center', justifyContent: 'center' },
  img: { height: 104, aspectRatio: 220 / 462 },
  pct: { ...Type.h3 },
  desc: { ...Type.caption, lineHeight: 16, textAlign: 'center' },
  clear: { alignSelf: 'flex-start', paddingVertical: 2 },
  note: { borderWidth: 1, borderRadius: Radius.card, paddingVertical: 10, paddingHorizontal: 12 },
});
