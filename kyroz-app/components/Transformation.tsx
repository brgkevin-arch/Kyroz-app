import React from 'react';
import { View, Text, Image } from 'react-native';
import { ThemePalette, Radius, Type, Spacing, Icone } from '../constants/theme';
import { WeightEntry } from '../lib/weight';
import { LocalIcon } from './Icons';
import { frnum } from '../lib/units';

// ── Module « Transformation » (premium « Kyroz+ ») ───────────────────────────
// La comparaison avant/après. Le verdict de pente (« Dans ta zone »…) vivait ici ; il est
// parti le 2026-10-23 (décision fondateur : « enlève dans ta zone »). Sa règle,
// `lib/datedGoal.ts::trackStatus`, reste testée mais n'a plus d'écran.
// RGPD : les photos restent LOCAL-ONLY (cf. lib/photos.ts) — rien n'est uploadé ici.

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });

// Largeur max de la paire avant/après (≈ une largeur de téléphone) : borne la
// hauteur des photos sur les écrans larges du web déployé.
const PHOTO_ROW_MAX_WIDTH = 420;

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
          {delta > 0 ? '+' : ''}{frnum(delta)} kg entre les deux photos
        </Text>
      )}
      {/* 🔴 LA PHRASE SUR LES PHOTOS A ÉTÉ RETIRÉE D'ICI le 2026-08-26 : elle
          s'affichait DEUX FOIS dans le même défilement. `PhotoCompare` n'a qu'un
          seul appelant — `WeightCheckin` — qui pose déjà la même phrase (au
          caractère près, même icône) une trentaine de lignes plus haut.
          ➡️ C'est bien CELLE-CI qui part, et pas l'autre : `PhotoCompare` ne se
          monte qu'à partir de DEUX photos, alors que la phrase doit être lue par
          l'abonné qui n'en a encore aucune — celui qui s'apprête à prendre la
          première. Garder celle-ci aurait fait disparaître l'avertissement au
          moment précis où il sert.
          ⚠️ Le texte lui-même vit maintenant dans `lib/photos.ts::PHOTOS_NOTICE_LOCALE`. */}
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
