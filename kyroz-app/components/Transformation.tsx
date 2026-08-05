import React from 'react';
import { View, Text, Image } from 'react-native';
import { ThemePalette, Radius, Type, Spacing } from '../constants/theme';
import { WeightEntry, todayStamp } from '../lib/weight';
import { GoalTarget } from '../lib/types';
import { trackStatus } from '../lib/datedGoal';

// ── Module « Transformation » (premium « Kyroz+ ») ───────────────────────────
// La PREUVE que l'objectif daté avance : le verdict de pente (courbe réelle vs
// trajectoire idéale) et la comparaison avant/après.
// RGPD : les photos restent LOCAL-ONLY (cf. lib/photos.ts) — rien n'est uploadé ici.

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Largeur max de la paire avant/après (≈ une largeur de téléphone) : borne la
// hauteur des photos sur les écrans larges du web déployé.
const PHOTO_ROW_MAX_WIDTH = 420;

/**
 * Verdict d'avancement — pensé pour RASSURER, pas mettre la pression (North Star).
 * Jamais d'alarme : « en retard » devient un constat neutre, et on rappelle TOUJOURS
 * que la pente est un repère et que Kyroz réajuste les calories tout seul. On met en
 * avant l'acquis (kg déjà pris/perdus), pas l'écart à la ligne.
 */
export function TrackVerdict({ t, goalTarget, currentWeightKg, paused = false }: {
  t: ThemePalette; goalTarget: GoalTarget; currentWeightKg: number;
  /** Le moteur ne pilote plus la trajectoire (insuffisance pondérale, sens contradictoire). */
  paused?: boolean;
}) {
  const st = trackStatus(goalTarget, currentWeightKg, todayStamp(), paused);
  if (!st) return null;

  const losing = goalTarget.target_weight_kg < goalTarget.start_weight_kg;
  // Progrès DANS LE BON SENS depuis le départ (positif = tu avances).
  const progress = Math.round((goalTarget.start_weight_kg - currentWeightKg) * (losing ? 1 : -1) * 10) / 10;

  // `paused` : le plan est bloqué à la maintenance, donc le poids ne PEUT plus
  // descendre — mais la trajectoire idéale, elle, continuait de descendre. On
  // affichait « en retard » à quelqu'un à qui l'app venait d'interdire tout déficit.
  // Reprocher un retard qu'on impose soi-même est exactement la charge mentale
  // qu'on refuse : ici on constate la pause, on ne juge rien.
  const headline =
    st.state === 'paused' ? { txt: 'Suivi en pause', color: t.text }
    : st.state === 'ahead' ? { txt: '🔥 En avance sur ton objectif', color: t.success }
    : st.state === 'on_track' ? { txt: '✓ Dans ta zone', color: t.success }
    : { txt: losing ? 'Ça descend à ton rythme' : 'Ça monte à ton rythme', color: t.text };

  return (
    <View style={{ backgroundColor: t.fill, borderRadius: Radius.card, padding: Spacing.md, gap: Spacing.xs }}>
      <Text style={{ ...Type.bodySmallStrong, color: headline.color }}>{headline.txt}</Text>
      {progress > 0 && (
        <Text style={{ ...Type.caption, color: t.textSecondary, lineHeight: 18 }}>
          Depuis le départ : {losing ? '-' : '+'}{Math.abs(progress)} kg 💪
        </Text>
      )}
      <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 17 }}>
        {st.state === 'paused'
          ? 'Kyroz ne pilote plus cette trajectoire pour le moment — ton plan est au maintien. Ton objectif reste enregistré.'
          : `La pente est un repère, pas une règle — à chaque pesée, Kyroz réajuste tes calories pour viser ${goalTarget.target_weight_kg} kg le ${frDate(goalTarget.target_date)}.`}
      </Text>
    </View>
  );
}

/** Comparaison avant / après : 1re et dernière photo, avec l'écart de poids. */
export function PhotoCompare({ t, photos, entries }: {
  t: ThemePalette; photos: Record<string, string>; entries: WeightEntry[];
}) {
  const dates = Object.keys(photos).filter((d) => photos[d]).sort();
  if (dates.length < 2) return null;

  const firstD = dates[0];
  const lastD = dates[dates.length - 1];
  const weightOf = (d: string) => entries.find((e) => e.date === d)?.weight_kg;
  const w1 = weightOf(firstD);
  const w2 = weightOf(lastD);
  const delta = w1 != null && w2 != null ? Math.round((w2 - w1) * 10) / 10 : null;

  return (
    <View style={{ gap: Spacing.sm }}>
      {/* Plafond de largeur : sans lui, sur le web (écran large) deux colonnes en
          ratio 3/4 donnent des photos de 800 px de haut. Sur mobile, sans effet. */}
      <View style={{ flexDirection: 'row', gap: Spacing.md, width: '100%', maxWidth: PHOTO_ROW_MAX_WIDTH }}>
        <Shot t={t} uri={photos[firstD]} label="Avant" date={firstD} kg={w1} />
        <Shot t={t} uri={photos[lastD]} label="Après" date={lastD} kg={w2} />
      </View>
      {delta != null && (
        <Text style={{ ...Type.bodySmallStrong, color: t.text }}>
          {delta > 0 ? '+' : ''}{delta} kg entre les deux photos
        </Text>
      )}
      <Text style={{ ...Type.micro, color: t.textTertiary }}>
        🔒 Tes photos restent sur ton téléphone, jamais envoyées.
      </Text>
    </View>
  );
}

function Shot({ t, uri, label, date, kg }: {
  t: ThemePalette; uri: string; label: string; date: string; kg?: number;
}) {
  return (
    <View style={{ flex: 1, gap: Spacing.sm }}>
      <Image
        source={{ uri }}
        style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.card, backgroundColor: t.fill }}
        resizeMode="cover"
      />
      <Text style={{ ...Type.captionStrong, color: t.text }}>{label}</Text>
      <Text style={{ ...Type.caption, color: t.textSecondary }}>
        {frDate(date)}{kg != null ? ` · ${kg} kg` : ''}
      </Text>
    </View>
  );
}
