import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { Presse } from './Presse';
import { ThemePalette, Radius, Type, Spacing, Trait, CIBLE_TACTILE_MIN, OPACITE_PRESSION, cardShadow } from '../constants/theme';
import { GrilleChoix, RondCoche } from './ui';
import { MesureField } from './MesureField';
import { BodyFatSource, Sex } from '../lib/types';
import {
  BF_CHART_MAX, bodyFatBounds, bodyFatConcern, fatFreeMassKg,
  provenanceDemandee, provenanceRetenue,
} from '../lib/safety';
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

/**
 * Le %MG le plus élevé que le sélecteur sait exprimer, par sexe.
 * ⚠️ RÉEXPORT — la table vit dans `lib/safety.ts`, qui est testable. Elle décide
 * aussi du seuil de la question de provenance : deux tables auraient divergé.
 */
export const CHART_MAX_PCT = BF_CHART_MAX;

interface Props {
  t: ThemePalette;
  sex: Sex;
  value?: number;
  source?: BodyFatSource;
  /**
   * ⚠️ La provenance part TOUJOURS avec la valeur, jamais par un second canal.
   * Un %MG dont la provenance arriverait une frappe plus tard serait calculé en
   * Mifflin puis en Katch — deux cibles pour une seule saisie.
   */
  onChange: (pct: number | undefined, source: BodyFatSource | undefined) => void;
  /**
   * Corps connu à cet instant (poids, taille, âge…), pour chiffrer ce qu'un %MG
   * atypique change sur la dépense estimée. Absent → le repère s'affiche sans le
   * chiffre : à l'onboarding, le poids peut ne pas être saisi.
   */
  body?: TdeeBody;
}

export function BodyFatPicker({ t, sex, value, source, onChange, body }: Props) {
  const levels = LEVELS[sex];
  // Bornes PAR SEXE : 3 % est sous le gras essentiel masculin et impossible chez
  // une femme (~12 % de gras essentiel). L'ancienne borne unique 3–60 était fausse.
  const [BF_MIN, BF_MAX] = bodyFatBounds(sex);

  // 🔴 PLUS DE CHAMP À TAPER (segment 2, P9, 2026-10-26) : le % passe par la roulette
  // de `MesureField`. Le champ, tant qu'il avait le focus, ne suivait plus la silhouette
  // touchée — et au départ du champ, le chiffre tapé regagnait en silence (constat 9).
  // Sans clavier, ce qui est allumé à l'écran est ce qui est enregistré.
  // La question de provenance ne s'affiche que sur une saisie MANUELLE. Elle reste
  // affichée pour qui a déjà répondu « mesuré » (sinon la réponse enregistrée serait
  // invisible et non modifiable au retour sur l'écran).
  const [saisiManuel, setSaisiManuel] = useState(source === 'measured');

  // Le sexe est ÉDITABLE dans « Informations » : un %MG parfaitement valide chez
  // l'homme (10 %, première silhouette) est sous le gras essentiel féminin (12 %).
  // Sans re-borner au changement de sexe, on stockait une valeur hors borne
  // physiologique — précisément celle que P0.4 vient d'introduire — et elle
  // alimentait `leanBodyMass`/Katch-McArdle avant d'être affichée à l'utilisateur.
  useEffect(() => {
    if (value == null) return;
    const clamped = Math.min(Math.max(value, BF_MIN), BF_MAX);
    // La provenance est CONSERVÉE : re-borner un chiffre ne change pas d'où il vient.
    // La perdre ici ferait retomber en Mifflin un %MG mesuré, sur un simple
    // changement de sexe — un déplacement de cible sans le moindre geste de saisie.
    if (clamped !== value) onChange(clamped, provenanceRetenue(sex, clamped, source));
  }, [sex]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deux repères, une seule source (`safety.bodyFatConcern`) : le %MG sous la charte
  // des silhouettes, et la masse maigre que ce %MG implique. Le second attrape ce que
  // le premier laisse passer — 20 % chez une femme de 80 kg / 1 m 70 ne franchit aucun
  // seuil plat, mais annonce 64 kg de masse maigre (FFMI 22,1), hors plafond féminin.
  const concern = bodyFatConcern(sex, value, body?.weight_kg ? { ...body } : undefined);

  // Le sélecteur s'arrête à 35 % (homme) / 43 % (femme). Au-delà, la personne n'a plus
  // rien à taper : elle prend la dernière silhouette et SOUS-DÉCLARE. Mesuré — une
  // femme de 125 kg y sous-déclare de 19 points, un homme de 135 kg de 12. Et la
  // sous-déclaration va dans le mauvais sens (masse maigre gonflée → déficit effacé,
  // en silence). Le repère `lean_mass` le détecte déjà ; ce qu'il disait ne servait à
  // rien dans CE cas — « la silhouette la plus proche sera plus juste » à quelqu'un
  // qui vient de taper la dernière est un cul-de-sac.
  const auPlafond = provenanceDemandee(sex, value);

  // Chiffré sur la MAINTENANCE (cf. bodyFatTdeeImpact) : à l'étape 3 de l'onboarding,
  // ni l'objectif ni les séances ne sont connus, donc la cible n'existe pas encore.
  // ⚠️ La PROVENANCE est passée : un %MG estimé ne déplace plus la dépense, l'impact
  // vaut alors 0 et l'écran ne doit annoncer aucun kcal (cf. bodyFatTdeeImpact).
  const impactKcal = (body && value != null && body.weight_kg > 0 && concern)
    ? bodyFatTdeeImpact({ ...body, sex }, value, source)
    : null;

  const leanKg = (body && value != null && body.weight_kg > 0)
    ? Math.round(fatFreeMassKg({ ...body, sex, body_fat_pct: value }))
    : null;

  return (
    <View style={{ gap: Spacing.md }}>
      <View style={styles.grid}>
        {levels.map((lv, i) => {
          const on = value === lv.pct;
          return (
            <Presse
              key={lv.pct}
              activeOpacity={OPACITE_PRESSION}
              // Taper une silhouette EST une estimation : on ne pose pas la question,
              // on enregistre la réponse. Demander « tu l'as mesuré ? » juste après un
              // tap sur un dessin serait absurde, et inviterait à répondre « oui ».
              onPress={() => { setSaisiManuel(false); onChange(on ? undefined : lv.pct, on ? undefined : 'estimated'); }}
              // 🔴 LA CARTE GARDE SON FOND, le contour et le rond coché disent le choix
              // (segment 2, P6, 2026-10-26) — la règle d'`OptionCard`, la seule DA de
              // sélection (CLAUDE.md §8). La carte pleine d'avant était la dernière, et la
              // silhouette claire s'y lisait mal sur fond blanc.
              style={[
                styles.cell,
                { backgroundColor: t.card, borderColor: on ? t.accent : (t.scheme === 'dark' ? t.line : 'transparent') },
                t.scheme === 'light' && cardShadow(t),
              ]}
            >
              <View style={styles.rond}><RondCoche t={t} selected={on} /></View>
              <View style={styles.figure}>
                <Image source={IMAGES[sex][i]} style={styles.img} resizeMode="contain" />
              </View>
              <Text style={[styles.pct, { color: t.text }]}>{lv.label}</Text>
              <Text style={[styles.desc, { color: t.textSecondary }]}>{lv.desc}</Text>
            </Presse>
          );
        })}
      </View>

      {/* La ligne montre le % dès qu'AUCUNE silhouette ne le porte (saisi à la roulette,
          ou enregistré avant : un 12 % du Profil doit rester visible quelque part) ;
          une silhouette touchée est déjà la réponse, elle s'allume au-dessus. La
          roulette s'ouvre sur la valeur courante. */}
      <MesureField
        t={t} mesure="gras" sex={sex}
        value={value != null && (saisiManuel || !levels.some((lv) => lv.pct === value)) ? String(value) : ''}
        depart={value}
        onChange={(v) => {
          const n = Math.min(Math.max(parseFloat(v), BF_MIN), BF_MAX);
          if (Number.isNaN(n)) return;
          setSaisiManuel(true);
          // La provenance déjà répondue est CONSERVÉE — corriger un chiffre mesuré
          // ne le rend pas estimé.
          onChange(n, provenanceRetenue(sex, n, source));
        }}
      />

      {/* ── Provenance ────────────────────────────────────────────────────────
          DEUX conditions, et il faut les deux.

          1. Saisie MANUELLE : un tap de silhouette est déjà une estimation, et lui
             poser la question inviterait à répondre « mesuré ». Sans cette condition,
             la DERNIÈRE silhouette (35 % H / 43 % F) déclencherait la question juste
             après un tap sur un dessin — elle est pile sur le seuil.
          2. Au-delà du plafond du sélecteur (`provenanceDemandee`) — décision du
             fondateur du 2026-08-06. Sous le seuil la question n'est jamais posée,
             donc `body_fat_source` reste `undefined` et tout le monde calcule en
             Mifflin. Ce que ça coûte est CHIFFRÉ dans `lib/safety.ts` (un H de 75 kg
             à 12 % sorti d'un DEXA perd 94 kcal/j).
             ⚠️ Ce n'est pas un oubli — ne pas « réparer » sans le fondateur.

          Pas un mot de « Katch-McArdle » ni de « métabolisme de base » : la question
          porte sur ce que la personne A FAIT, pas sur ce que le moteur en fera. Et
          aucune option n'est pré-cochée — pré-cocher « mesuré » ferait basculer la
          formule sur un chiffre deviné, pré-cocher « estimé » répondrait à sa place.
          Sans réponse, le moteur calcule comme estimé : le défaut va vers la prudence. */}
      {saisiManuel && provenanceDemandee(sex, value) && (
        <View style={{ gap: Spacing.sm }}>
          <Text style={{ color: t.text, ...Type.bodySmallStrong }}>
            Ce chiffre, tu l'as mesuré ?
          </Text>
          {/* Une réponse par ligne, sur toute la largeur (2026-10-25). Toucher la réponse
              choisie la retire : on peut revenir à « pas répondu ». */}
          <GrilleChoix<'measured' | 'estimated'>
            t={t}
            options={[{ label: 'Oui, avec un appareil', value: 'measured' }, { label: "Non, c'est une estimation", value: 'estimated' }]}
            estChoisi={(v) => source === v}
            onChoisir={(v) => onChange(value, source === v ? undefined : v)}
          />
          <Text style={{ color: t.textSecondary, ...Type.explication }}>
            {source === 'measured'
              ? 'Balance à impédance, pince à plis, DEXA. Kyroz s\'appuiera dessus pour calculer ta dépense.'
              : 'Kyroz reste sur une estimation prudente de ta dépense. Ton pourcentage est gardé et affiché comme tu l\'as saisi.'}
          </Text>
        </View>
      )}

      {/* Repères de plausibilité — cf. safety.bodyFatConcern. On informe, on ne bloque
          pas : ces valeurs existent, elles sont juste rarement exactes au jugé.
          ⚠️ `below_chart` ne peut venir que d'une saisie manuelle (son seuil EST la
          silhouette la plus maigre). `lean_mass`, lui, PEUT se lever sur un tap — et
          c'est voulu : taper « très athlétique » à 80 kg pour 1 m 70 annonce une masse
          maigre hors plafond, que ce soit tapé ou choisi ne change rien au chiffre. */}
      {concern && (
        <View style={[styles.note, { borderColor: t.warning, backgroundColor: t.card }]}>
          <Text style={{ ...Type.captionStrong, color: t.text, marginBottom: Spacing.xs }}>
            {concern === 'lean_mass' && leanKg != null
              ? `Ce chiffre annonce ${leanKg} kg de masse maigre`
              : `${value} %, c'est un niveau d'athlète de compétition`}
          </Text>
          <Text style={{ ...Type.explication, color: t.textSecondary }}>
            {concern === 'lean_mass'
              // ⚠️ DEUX SITUATIONS OPPOSÉES derrière le même repère, et il faut les
              // distinguer : au PLAFOND du sélecteur le chiffre est trop HAUT et la
              // personne n'a plus de silhouette à choisir (« prends la plus proche »
              // serait un cul-de-sac) ; en dessous il est trop BAS et c'est bien la
              // silhouette qui la rattrapera. Mesuré : les deux lèvent `lean_mass`.
              ? auPlafond
                ? `C'est au-dessus de ce que porte la quasi-totalité des ${sex === 'female' ? 'femmes' : 'hommes'} de ta taille. Si tu penses être au-delà, saisis un pourcentage à la main juste en dessous.`
                : `C'est au-dessus de ce que porte la quasi-totalité des ${sex === 'female' ? 'femmes' : 'hommes'} de ta taille. Kyroz calcule ta dépense sur cette masse${impactKcal != null && impactKcal > 0 ? `, et la relève de ${impactKcal} kcal/jour` : ''}. Autant de déficit en moins si le % est trop bas. La silhouette la plus proche sera plus juste.`
              : impactKcal != null && impactKcal > 0
                ? `Ce chiffre relève ta dépense estimée de ${impactKcal} kcal/jour, autant de déficit en moins si tu te trompes. En cas de doute, la silhouette la plus proche sera plus juste.`
                : 'En cas de doute, la silhouette la plus proche sera plus juste\u00A0: le moteur estime alors ta masse grasse, et une estimation vaut mieux qu\'un chiffre faux.'}
          </Text>
        </View>
      )}

      {value != null && (
        <Presse onPress={() => { setSaisiManuel(false); onChange(undefined, undefined); }} activeOpacity={OPACITE_PRESSION} style={styles.clear}>
          <Text style={{ ...Type.captionStrong, color: t.textTertiary }}>Effacer ma sélection</Text>
        </Presse>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  cell: {
    width: '48%',
    flexGrow: 1,
    borderWidth: Trait.controle,
    borderRadius: Radius.card,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  // 🔴 150 ET NON 104 (segment 2, P8, 2026-10-26) : à 104, ~10 et ~15 % se
  // distinguaient mal. 150 pt × 3 = 450 px, sous les 479 px des fichiers : l'image
  // n'est pas agrandie au-delà de sa définition.
  figure: { height: 150, alignItems: 'center', justifyContent: 'center' },
  rond: { position: 'absolute', top: Spacing.md, right: Spacing.md },
  // 🔴 CE RATIO EST CELUI DES FICHIERS SERVIS, ET IL PÉRIME QUAND ON LES REGÉNÈRE.
  // Il valait `220 / 462` — les dimensions du jeu d'avant. Les planches redécoupées
  // le 2026-08-23 sortent en **273 × 479** (le canevas commun est calculé sur le plus
  // large des douze, il ne se choisit pas). Avec l'ancien ratio et `resizeMode:
  // 'contain'`, la silhouette n'aurait pas été déformée — elle aurait été RÉTRÉCIE
  // dans une boîte trop étroite, avec du vide au-dessus et en dessous. Un défaut qui
  // ne casse rien, ne lève aucune erreur, et se lit comme « les nouvelles images sont
  // plus petites ».
  // ➡️ Compté par `lib/__tests__/silhouettes.test.ts`, qui lit les PNG sur le disque :
  // le jour où la découpe rend d'autres dimensions, le test rougit au lieu de laisser
  // l'écran rapetisser en silence.
  img: { height: 150, aspectRatio: 273 / 479 },
  pct: { ...Type.h3 },
  desc: { ...Type.caption, lineHeight: 16, textAlign: 'center' },
  // ⚠️ 44 pt PLEINS. À `paddingVertical: Spacing.xs` il mesurait ~28 pt : le
  // libellé est en `captionStrong`, donc il a l'air d'un lien — mais c'est le
  // seul moyen de revenir en arrière après avoir choisi une silhouette.
  clear: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN },
  note: { borderWidth: Trait.fin, borderRadius: Radius.card, paddingVertical: Spacing.md, paddingHorizontal: Spacing.md },
});
