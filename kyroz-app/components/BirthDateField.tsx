import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { ThemePalette } from '../constants/theme';
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
// produit rien (cf. `toStamp`). Il affiche l'âge qui en découle — c'est le
// retour dont l'utilisateur a besoin pour vérifier qu'il n'a pas fauté d'un
// chiffre, et ça montre au passage d'où sort l'âge du profil.

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

  // Resynchro quand la valeur change de l'EXTÉRIEUR (ouverture de l'éditeur,
  // profil tiré du cloud). On ne touche pas au texte pendant la frappe : c'est
  // exactement le piège qui transformait « 23 » en « 33 » sur le %MG.
  useEffect(() => {
    const s = split(value);
    setD(s.d); setMo(s.mo); setY(s.y);
  }, [value]);

  const push = (dd: string, mm: string, yy: string) => {
    const stamp = (dd && mm && yy.length === 4)
      ? toStamp(parseInt(yy, 10), parseInt(mm, 10), parseInt(dd, 10))
      : null;
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
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
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

      <Text style={{ color: impossible || tropJeune || anneeAberrante ? t.warning : t.textSecondary, fontSize: 13, lineHeight: 18 }}>
        {impossible || anneeAberrante
          ? 'Cette date n’existe pas — vérifie le jour et le mois.'
          : tropJeune
            ? `Kyroz est réservé aux ${MIN_AGE} ans et plus.`
            : age != null
              ? `${age} ans. Ton âge se mettra à jour tout seul à chaque anniversaire 🎂`
              : fallbackAge != null
                ? `Âge enregistré : ${fallbackAge} ans. Renseigne ta date de naissance pour qu’il se mette à jour tout seul.`
                : 'On en déduit ton âge — et il restera juste, année après année.'}
      </Text>
    </View>
  );
}
