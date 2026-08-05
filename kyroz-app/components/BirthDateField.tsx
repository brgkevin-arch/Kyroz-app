import React, { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { ThemePalette, Type, Spacing } from '../constants/theme';
import { Field } from './ui';
import { ageOn, toStamp, BIRTH_YEAR_MIN } from '../lib/birthday';
import { todayStamp } from '../lib/weight';
import { MIN_AGE } from '../lib/safety';

// ── Saisie de la date de naissance ──────────────────────────────────────────
//
// Trois champs numériques plutôt qu'un sélecteur de date, pour la MÊME raison
// que les puces d'échéance de l'objectif daté : un date-picker est lourd sur le
// web, et le web est la version que les gens utilisent aujourd'hui. Trois
// nombres se tapent au pavé numérique, partout, sans dépendance.
//
// Le composant ne rend une date que si elle EXISTE vraiment : « 31/02 » ne
// produit rien (cf. `toStamp`). Il ne commente PAS une saisie valide — l'âge
// reste lisible sur la ligne « Informations » du profil, donc une faute de frappe
// se voit quand même. Il ne parle que pour ce qui bloque, ou ce qui manque.

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

const split = (stamp?: string) => {
  const m = stamp ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(stamp) : null;
  return m ? { d: String(+m[3]), mo: String(+m[2]), y: m[1] } : { d: '', mo: '', y: '' };
};

export function BirthDateField({ t, value, onChange, fallbackAge }: Props) {
  const init = split(value);
  const [d, setD] = useState(init.d);
  const [mo, setMo] = useState(init.mo);
  const [y, setY] = useState(init.y);

  // ⚠️ Resynchro UNIQUEMENT sur un changement venu de l'EXTÉRIEUR (ouverture de
  // l'éditeur, profil tiré du cloud) — jamais sur notre propre émission.
  //
  // C'est le piège du « 23 → 33 », troisième occurrence : taper une date qui
  // n'existe pas (31/02) fait émettre `undefined`, le parent le renvoie, et la
  // synchro VIDAIT les trois champs sous les doigts. L'utilisateur voyait sa
  // saisie disparaître, et l'écran affichait « renseigne ta date » au lieu de
  // « cette date n'existe pas ». `emitted` mémorise ce qu'on vient d'envoyer :
  // ce qui nous revient de nous-même ne réécrit rien.
  const emitted = useRef<string | undefined>(value);
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    const s = split(value);
    setD(s.d); setMo(s.mo); setY(s.y);
  }, [value]);

  const push = (dd: string, mm: string, yy: string) => {
    const stamp = (dd && mm && yy.length === 4)
      ? toStamp(parseInt(yy, 10), parseInt(mm, 10), parseInt(dd, 10))
      : null;
    emitted.current = stamp ?? undefined;
    onChange(stamp ?? undefined);
  };
  const num = (s: string, max: number) => s.replace(/[^0-9]/g, '').slice(0, max);

  const today = todayStamp();
  const age = ageOn(value, today);
  // Saisie complète mais date inexistante (31/02, 29/02 hors bissextile) → on le dit
  // au lieu de laisser un champ silencieusement sans effet.
  const complete = d !== '' && mo !== '' && y.length === 4;
  const impossible = complete && age == null;
  const tropJeune = age != null && age < MIN_AGE;
  const anneeAberrante = y.length === 4 && parseInt(y, 10) < BIRTH_YEAR_MIN;

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Field t={t} label="Jour" value={d} placeholder="2" keyboardType="number-pad"
            onChangeText={(v) => { const n = num(v, 2); setD(n); push(n, mo, y); }} />
        </View>
        <View style={{ flex: 1 }}>
          <Field t={t} label="Mois" value={mo} placeholder="8" keyboardType="number-pad"
            onChangeText={(v) => { const n = num(v, 2); setMo(n); push(d, n, y); }} />
        </View>
        <View style={{ flex: 1.3 }}>
          <Field t={t} label="Année" value={y} placeholder="1994" keyboardType="number-pad"
            onChangeText={(v) => { const n = num(v, 4); setY(n); push(d, mo, n); }} />
        </View>
      </View>

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
