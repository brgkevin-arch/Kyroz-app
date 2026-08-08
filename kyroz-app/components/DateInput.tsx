import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { ThemePalette, Spacing } from '../constants/theme';
import { Field } from './ui';
import { toStamp } from '../lib/birthday';

// ── Saisie d'une date en TROIS NOMBRES ──────────────────────────────────────
//
// Pas de sélecteur de date, et c'est un choix : il faudrait une dépendance
// NATIVE (donc un build et une revue de store, cf. CLAUDE.md §2), et il est
// lourd sur le web — qui est la version que les testeurs utilisent aujourd'hui.
// Trois nombres se tapent au pavé numérique, partout, sans rien installer.
//
// ⚠️ Extrait de `BirthDateField` le 2026-08-07, quand l'échéance de l'objectif
// daté a eu besoin du même champ. Ce qui est mis en commun n'est PAS la mise en
// page — c'est le garde `emitted` ci-dessous, dont l'absence a produit trois
// fois le même bug (CLAUDE.md §11, « le %MG saisi 23 enregistré 33 », puis
// « taper 31/02 vide les trois champs »). Le recopier dans un second fichier,
// c'était garantir qu'un des deux finisse par le perdre.

interface Props {
  t: ThemePalette;
  /** Date à afficher ('YYYY-MM-DD'), ou `undefined` si rien de valide. */
  value?: string;
  /**
   * `stamp` est `undefined` tant que la saisie est incomplète **ou** que la date
   * n'existe pas (31/02, 29/02 hors bissextile). `complete` sépare les deux :
   * c'est lui qui permet à l'appelant de dire « il manque le mois » plutôt que
   * « cette date n'existe pas » — deux phrases très différentes pour la personne.
   */
  onChange: (stamp: string | undefined, complete: boolean) => void;
  /** Exemples affichés dans les trois cases. */
  placeholders?: { d: string; mo: string; y: string };
}

const split = (stamp?: string) => {
  const m = stamp ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(stamp) : null;
  return m ? { d: String(+m[3]), mo: String(+m[2]), y: m[1] } : { d: '', mo: '', y: '' };
};

export function DateInput({ t, value, onChange, placeholders }: Props) {
  const init = split(value);
  const [d, setD] = useState(init.d);
  const [mo, setMo] = useState(init.mo);
  const [y, setY] = useState(init.y);

  // ⚠️ Resynchro UNIQUEMENT sur un changement venu de l'EXTÉRIEUR (ouverture de
  // l'éditeur, profil tiré du cloud, puce d'échéance tapée à côté) — jamais sur
  // notre propre émission.
  //
  // Sans ce garde : taper une date qui n'existe pas (31/02) fait émettre
  // `undefined`, le parent le renvoie, et la synchro VIDE les trois champs sous
  // les doigts. La personne voit sa saisie disparaître et l'écran lui réclame une
  // date qu'elle est justement en train de taper. `emitted` mémorise ce qu'on
  // vient d'envoyer : ce qui nous revient de nous-même ne réécrit rien.
  const emitted = useRef<string | undefined>(value);
  useEffect(() => {
    if (value === emitted.current) return;
    emitted.current = value;
    const s = split(value);
    setD(s.d); setMo(s.mo); setY(s.y);
  }, [value]);

  const push = (dd: string, mm: string, yy: string) => {
    const complete = dd !== '' && mm !== '' && yy.length === 4;
    const stamp = complete
      ? toStamp(parseInt(yy, 10), parseInt(mm, 10), parseInt(dd, 10))
      : null;
    emitted.current = stamp ?? undefined;
    onChange(stamp ?? undefined, complete);
  };
  const num = (s: string, max: number) => s.replace(/[^0-9]/g, '').slice(0, max);

  return (
    <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
      <View style={{ flex: 1 }}>
        <Field t={t} label="Jour" value={d} placeholder={placeholders?.d} keyboardType="number-pad"
          onChangeText={(v) => { const n = num(v, 2); setD(n); push(n, mo, y); }} />
      </View>
      <View style={{ flex: 1 }}>
        <Field t={t} label="Mois" value={mo} placeholder={placeholders?.mo} keyboardType="number-pad"
          onChangeText={(v) => { const n = num(v, 2); setMo(n); push(d, n, y); }} />
      </View>
      <View style={{ flex: 1.3 }}>
        <Field t={t} label="Année" value={y} placeholder={placeholders?.y} keyboardType="number-pad"
          onChangeText={(v) => { const n = num(v, 4); setY(n); push(d, mo, n); }} />
      </View>
    </View>
  );
}
