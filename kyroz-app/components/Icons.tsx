import React from 'react';
import Svg, { Rect, Path, Circle } from 'react-native-svg';

// ── Les 17 icônes d'interface ────────────────────────────────────────────────
// Dessinées par Claude Design (2026-08-06) DANS LE GABARIT des cinq icônes
// d'onglets, qui restent la référence de la famille : viewBox 27, trait 1,7
// (2,2 en état actif), bouts et jointures arrondis, **aucun remplissage**, et
// la couleur passée de l'extérieur — jamais écrite dans le tracé.
//
// **Pourquoi elles remplacent des émojis.** Un émoji n'est pas une icône : il
// porte sa propre couleur (impossible de le faire suivre le thème ou l'accent),
// son propre dessin selon la plateforme, et son propre poids visuel. Sur les 55
// émojis comptés dans `app/` et `components/`, 39 tenaient la place d'une icône —
// ce sont ceux-là. Les 16 autres n'étaient qu'une ponctuation (« Journée
// réadaptée 👊 ») : ils ont été SUPPRIMÉS, pas remplacés. Aucun pictogramme ne
// remplace un ton de voix.
//
// ✅ LA PASSE EST FINIE le 2026-08-09 (E22) — et ce commentaire l'avait déjà
// annoncée une fois, à tort. Le comptage d'origine portait sur `app/` +
// `components/` ; il restait 13 émojis AFFICHÉS depuis `lib/streak.ts`,
// `lib/notifications.ts` et `constants/legal.ts`. Un inventaire d'interface se
// compte sur ce qui est AFFICHÉ, pas sur les fichiers qui ressemblent à de
// l'interface.
//
// ⚠️ NE PLUS JAMAIS L'ÉCRIRE ICI. C'est la triple copie — ce commentaire, le
// message de commit et CLAUDE.md §8 — qui a fait tenir un « plus un seul émoji »
// faux pendant deux jours : trois phrases qui se confirmaient l'une l'autre et
// aucun compteur. La source est désormais `lib/__tests__/emojiInterface.test.ts`,
// qui balaye les CINQ dossiers et échoue à la première réintroduction.
//
// ⚠️ Ce fichier ne dessine QUE des tracés. Il ne connaît ni le thème ni l'accent :
// l'appelant passe `color`, exactement comme pour les onglets. C'est ce qui permet
// à une même icône d'être encre sur un fond clair, blanche sur un bouton, ou de la
// couleur d'accent dans un lien — sans trois variantes du dessin.
//
// ⚠️ `h.01` dans un tracé n'est pas une coquille : c'est un segment de longueur
// quasi nulle qui, avec un bout ARRONDI, rend un point. C'est le point du « ! »
// et du « i ». Le retirer efface le point sans rien casser d'autre — donc en
// silence.

type Props = { color: string; size?: number; focused?: boolean };

const stroke = (focused?: boolean) => (focused ? 2.2 : 1.7);

/** L'enveloppe commune — une seule définition du gabarit pour les 17. */
function Frame({ size, children }: { size: number; children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 27 27" fill="none">
      {children}
    </Svg>
  );
}

/**
 * La taille par défaut est 16 : celle d'une icône POSÉE DANS une ligne de texte,
 * qui est le cas de loin le plus fréquent ici. Les bandeaux et les états vides
 * passent la leur.
 */
const D = 16;

// ── États et signaux ─────────────────────────────────────────────────────────

/** Avertissement — un repas est un peu pauvre en protéines. */
export function AvertissementIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M12.45 6.23Q13.5 4.3 14.55 6.23L21.75 19.47Q22.8 21.4 20.6 21.4H6.4Q4.2 21.4 5.25 19.47Z" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.5 11.2v4.2M13.5 18.4h.01" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Information — un repas est légèrement au-dessus ou en dessous de la cible. */
export function InfoIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Circle cx="13.5" cy="13.5" r="9.4" stroke={color} strokeWidth={w} />
      <Path d="M13.5 12.6v5M13.5 9.3h.01" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Donnée locale — photos de progression, mention de confidentialité. */
export function LocalIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Rect x="7" y="11.8" width="13" height="10.8" rx="3.4" stroke={color} strokeWidth={w} strokeLinejoin="round" />
      <Path d="M10.3 11.8V9a3.2 3.2 0 0 1 6.4 0v2.8" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Repas géré par l'utilisateur — une carte que Kyroz ne planifie pas. */
export function RepasLibreIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M16.9 4.7 21.9 9.7 10.2 21.4 4.3 22.5 5.4 16.6Z" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M14.4 7.2 19.4 12.2" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Protection — la série est protégée après un jour manqué. */
export function ProtectionIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M13.5 3.9 21.3 6.7v6.2c0 4.9-3.2 8.4-7.8 10.2-4.6-1.8-7.8-5.3-7.8-10.2V6.7Z" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Réussite — liste de courses terminée, premier plan prêt. */
export function ReussiteIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Circle cx="13.5" cy="13.5" r="9.4" stroke={color} strokeWidth={w} />
      <Path d="M9.3 13.7 12.3 16.7 17.7 10.5" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Conseil — suggestion de réglage de macros. */
export function ConseilIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M9.6 16.1a6 6 0 1 1 7.8 0c-.8.7-1.3 1.6-1.3 2.6h-5.2c0-1-.5-1.9-1.3-2.6Z" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M11.4 21.4h4.2" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

// ── Mesures et objectifs ─────────────────────────────────────────────────────

/** Durée de préparation — fiche recette. */
export function DureeIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Circle cx="13.5" cy="13.5" r="9.4" stroke={color} strokeWidth={w} />
      <Path d="M13.5 8.3v5.4l3.5 2" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Pesée — bandeau « c'est le moment de te peser ». */
export function PeseeIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M7 21A9.4 9.4 0 1 1 20 21" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.5 14.2 18.3 9.4" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Objectif daté — du poids de départ au poids visé. */
export function ObjectifIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M7.2 4.4v18.4" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M7.2 5.7h11.9l-2.6 4.2 2.6 4.2H7.2Z" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Anniversaire — célébration, une fois l'an. */
export function AnniversaireIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Rect x="4.4" y="13" width="18.2" height="10" rx="3.6" stroke={color} strokeWidth={w} strokeLinejoin="round" />
      <Path d="M13.5 13V9.5M13.5 6.7h.01" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

// ── Nutrition ────────────────────────────────────────────────────────────────

/** Hydratation — carte de suivi de l'eau. */
export function HydratationIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M13.5 3.9c4.4 5 6.6 8.5 6.6 11.2a6.6 6.6 0 0 1-13.2 0c0-2.7 2.2-6.2 6.6-11.2Z" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Fibres — fiche recette. */
export function FibresIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M5.6 21.4C5.6 11.9 10.4 5.6 21.4 5.6 21.4 16.6 15.1 21.4 5.6 21.4Z" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.9 20.1 16.9 10.1" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Repas — bandeau de bilan, état vide. */
export function RepasIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Circle cx="13.5" cy="13.5" r="9.4" stroke={color} strokeWidth={w} />
      <Circle cx="13.5" cy="13.5" r="4.4" stroke={color} strokeWidth={w} />
    </Frame>
  );
}

/** Petit-déjeuner — récap du premier plan. */
export function PetitDejIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Path d="M3.9 20.1h19.2" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8.5 20.1a5 5 0 0 1 10 0" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M13.5 6.3v2.4M7.2 9.2l1.7 1.7M19.8 9.2l-1.7 1.7" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Déjeuner — récap du premier plan. */
export function DejeunerIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Circle cx="13.5" cy="13.5" r="4.7" stroke={color} strokeWidth={w} />
      <Path d="M13.5 2.9v2.6M13.5 21.5v2.6M2.9 13.5h2.6M21.5 13.5h2.6" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Collation — récap du premier plan. */
export function CollationIcon({ color, size = D, focused }: Props) {
  const w = stroke(focused);
  return (
    <Frame size={size}>
      <Circle cx="13.5" cy="15.4" r="6.7" stroke={color} strokeWidth={w} />
      <Path d="M13.5 8.7V5.9c0-1 1-1.8 2.7-1.9" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** Le créneau d'un repas → son icône. Le dîner reprend l'assiette. */
const PAR_CRENEAU: Record<string, (p: Props) => React.ReactElement> = {
  breakfast: PetitDejIcon,
  lunch: DejeunerIcon,
  dinner: RepasIcon,
  snack: CollationIcon,
};

/**
 * L'icône du créneau, choisie à l'affichage. Le repli est l'assiette : un créneau
 * inconnu doit rendre QUELQUE CHOSE — un trou dans une liste de repas se lit comme
 * une donnée manquante, alors que c'est juste un libellé qu'on ne connaît pas.
 */
export function IconeRepas({ type, color, size = D, focused }: Props & { type: string }) {
  const I = PAR_CRENEAU[type] ?? RepasIcon;
  return <I color={color} size={size} focused={focused} />;
}
