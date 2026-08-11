import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { ThemePalette, Radius, Spacing, Type, Trait, CIBLE_TACTILE_MIN } from '../constants/theme';
import { ReminderTime, clampReminderTime } from '../lib/reminder';

// ── Heure du rappel quotidien ───────────────────────────────────────────────
//
// Deux champs numériques plutôt qu'un sélecteur d'heure, pour la MÊME raison que
// `BirthDateField` : un time-picker natif est une dépendance de plus et rend mal
// sur le web, qui est la version que les gens utilisent aujourd'hui. Deux
// nombres se tapent au pavé numérique, partout.
//
// ⚠️ **Les trois puces de raccourci (Matin · Midi · Soir) sont RETIRÉES**
// (décision fondateur, 2026-08-11) : il ne reste que l'heure. Elles étaient le
// dernier vestige du modèle d'avant — le rappel se réglait sur trois valeurs en
// dur — et gardaient trois heures particulières au rang de proposition alors que
// le modèle est une heure libre depuis le 2026-08-07. Deux champs et une rangée
// de puces posent la même question deux fois.
// ➡️ `REMINDER_PRESETS` SURVIT quand même, et il ne faut pas le supprimer en
// croyant nettoyer : il porte la reprise de l'ancien format stocké et l'heure par
// défaut. Voir le commentaire qui l'accompagne dans `lib/reminder.ts`.
//
// ⚠️ La saisie ne se valide qu'au `onBlur`, jamais à la frappe : chaque
// changement REPROGRAMME la notification système, et taper « 20 » émettrait
// d'abord « 2h ». (`onEndEditing` serait le geste naturel — c'est un no-op sur
// react-native-web, cf. la note du même piège sur le %MG.)

interface Props {
  t: ThemePalette;
  value: ReminderTime;
  onChange: (time: ReminderTime) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');
const digits = (s: string) => s.replace(/[^0-9]/g, '').slice(0, 2);

export function ReminderTimeField({ t, value, onChange }: Props) {
  const [hh, setHh] = useState(pad(value.hour));
  const [mm, setMm] = useState(pad(value.minute));

  // ⚠️ Ce que les champs contiennent À CET INSTANT, doublé en `ref`.
  //
  // Le `commit` lisait l'ÉTAT, c'est-à-dire ce que le dernier rendu avait
  // capturé. Un `blur` qui arrive avant que React n'ait re-rendu lit alors une
  // frappe de retard — et le pire résultat possible ici est celui-là : le champ
  // montre 45, le rappel s'arme sur 30. Un chiffre affiché doit être celui qui
  // sera servi. La `ref` supprime la question : elle est écrite dans la frappe
  // elle-même, donc `commit` ne dépend plus du cycle de rendu.
  //
  // (Honnêteté sur la mesure : l'écart 45/30 observé dans le navigateur venait
  // du harnais — un `blur()` appelé par script ne dispatche rien dans un onglet
  // qui n'a pas le focus, donc c'est le champ des MINUTES qui ne se validait
  // pas du tout. La course décrite ci-dessus reste réelle, mais elle n'a pas
  // été reproduite à la main : ces refs la ferment par construction.)
  const hhRef = useRef(hh);
  const mmRef = useRef(mm);
  const poserH = (v: string) => { hhRef.current = v; setHh(v); };
  const poserM = (v: string) => { mmRef.current = v; setMm(v); };

  // Resynchro UNIQUEMENT sur un changement venu de l'EXTÉRIEUR (préférence relue
  // du stockage après le montage) — jamais sur notre propre émission, qui
  // viderait les champs sous les doigts.
  const emitted = useRef(value);
  useEffect(() => {
    if (value.hour === emitted.current.hour && value.minute === emitted.current.minute) return;
    emitted.current = value;
    poserH(pad(value.hour));
    poserM(pad(value.minute));
  }, [value]);

  // Le champ se VIDE à la prise de focus (et son placeholder montre la valeur en
  // cours) : à deux caractères, un champ pré-rempli oblige à effacer avant de
  // pouvoir taper. Corollaire — vidé puis quitté sans rien taper, on revient à
  // l'heure en cours plutôt que de poser minuit : effacer n'est pas demander 0h00.
  const commit = () => {
    const next = clampReminderTime(
      hhRef.current === '' ? value.hour : parseInt(hhRef.current, 10),
      mmRef.current === '' ? value.minute : parseInt(mmRef.current, 10),
    );
    poserH(pad(next.hour));
    poserM(pad(next.minute));
    if (next.hour === value.hour && next.minute === value.minute) return;
    emitted.current = next;
    onChange(next);
  };

  // ⚠️ Largeur POSÉE, et le champ en `flex: 1, minWidth: 0` dedans — exactement
  // le montage de `Field` (components/ui.tsx) et pour la même raison : un
  // `<input>` de react-native-web a une largeur intrinsèque d'une vingtaine de
  // caractères. Sans ces deux réglages, les deux cadres à deux chiffres
  // occupaient toute la ligne et celui des minutes sortait de l'écran.
  const cadre = {
    flexDirection: 'row' as const,
    backgroundColor: t.scheme === 'dark' ? t.fill : t.card,
    borderRadius: Radius.button,
    borderWidth: Trait.fin,
    borderColor: t.line,
    paddingHorizontal: Spacing.md,
    width: CIBLE_TACTILE_MIN + Spacing.xxxl,
  };
  const saisie = {
    ...Type.h3,
    flex: 1,
    minWidth: 0,
    color: t.text,
    paddingVertical: Spacing.md,
    textAlign: 'center' as const,
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      <View style={cadre}>
        <TextInput
          value={hh}
          onChangeText={(v) => poserH(digits(v))}
          onBlur={commit}
          onFocus={() => poserH('')}
          keyboardType="number-pad"
          maxLength={2}
          accessibilityLabel="Heure du rappel"
          placeholder={pad(value.hour)}
          placeholderTextColor={t.textQuaternary}
          style={saisie}
        />
      </View>
      <Text style={{ ...Type.h3, color: t.textSecondary }}>h</Text>
      <View style={cadre}>
        <TextInput
          value={mm}
          onChangeText={(v) => poserM(digits(v))}
          onBlur={commit}
          onFocus={() => poserM('')}
          keyboardType="number-pad"
          maxLength={2}
          accessibilityLabel="Minutes du rappel"
          placeholder={pad(value.minute)}
          placeholderTextColor={t.textQuaternary}
          style={saisie}
        />
      </View>
    </View>
  );
}
