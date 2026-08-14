import React, { useEffect, useRef } from 'react';
import { View, Text, ScrollView, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { ThemePalette, Type, Radius, Trait, CIBLE_TACTILE_MIN } from '../constants/theme';
import { useReduceMotion } from '../lib/reduceMotion';

// ── Une colonne de roulette ─────────────────────────────────────────────────
//
// Un `ScrollView` qui s'aimante sur ses lignes. AUCUNE dépendance native : ni
// `@react-native-community/datetimepicker`, ni `@react-native-picker/picker`.
//
// 🔴 CE CHOIX N'EST PAS UNE ÉCONOMIE DE PAQUET, il tient à DEUX choses que le
// natif casserait :
//  1. **le web**. C'est la version que les testeurs utilisent (le lien du
//     README), et ces modules n'y rendent rien d'utilisable. Il faudrait un
//     `.web.tsx` séparé, donc deux roulettes à tenir d'accord — la « seconde
//     source de vérité » de §10, sur un champ qui alimente le BMR ;
//  2. **la voie OTA**. Une dépendance native impose un build ET une revue
//     (§2) : ce chantier ne partirait pas avant le binaire 1.0.0 (4). En JS pur,
//     il part par `eas update` comme le reste.
// ⚠️ Le prix à connaître : l'inertie et l'aimantation sont celles du `ScrollView`
// de la plateforme, pas celles d'`UIDatePicker`. C'est très proche sur iOS, plus
// sec sur le web. ➡️ Et donc ça se juge AU SIMULATEUR, jamais dans le panneau
// navigateur (§5) — c'est un GESTE.
//
// ⚠️ La HAUTEUR DE LIGNE est `CIBLE_TACTILE_MIN` (44) et ce n'est pas décoratif :
// sous cette valeur, l'aimantation place deux lignes à portée du même doigt et on
// choisit systématiquement à côté. Une roulette n'a pas de bouton à viser — sa
// ligne EST sa cible.

const HAUTEUR_LIGNE = CIBLE_TACTILE_MIN;
/**
 * Combien de temps sans un seul événement de défilement avant de dire « c'est
 * posé ». Assez long pour laisser l'aimantation finir, assez court pour que le
 * chiffre choisi ne traîne pas derrière le doigt.
 * ⚠️ Ce n'est PAS une durée d'animation : rien n'est animé ici, donc rien à
 * prendre dans `DUREE` (et `mouvementDA` ne l'y cherche pas).
 */
const POSE_MS = 120;
export const LIGNES_VISIBLES = 5;                              // impair : il faut un milieu
export const HAUTEUR_ROULETTE = HAUTEUR_LIGNE * LIGNES_VISIBLES;
const MARGE = (HAUTEUR_ROULETTE - HAUTEUR_LIGNE) / 2;          // pour centrer la 1ʳᵉ et la dernière

interface Props<T> {
  t: ThemePalette;
  options: T[];
  value: T;
  onChange: (v: T) => void;
  /** Ce qui s'affiche sur la ligne (par défaut, la valeur telle quelle). */
  libelle?: (v: T) => string;
  /** Lu par les lecteurs d'écran — une colonne sans nom ne se navigue pas. */
  nom: string;
  /**
   * Repère du harnais Playwright. Une roulette ne se remplit pas par un
   * placeholder : le harnais pose le défilement de CETTE colonne, ce qui passe
   * par le vrai `onScroll`. Sans repère stable, il devrait deviner la colonne à
   * sa position — et une inversion Jour/Mois passerait inaperçue.
   */
  testID?: string;
  largeur?: number;
}

export function Wheel<T extends string | number>({
  t, options, value, onChange, libelle, nom, testID, largeur,
}: Props<T>) {
  const ref = useRef<ScrollView>(null);
  const reduire = useReduceMotion();
  const index = Math.max(0, options.indexOf(value));

  // ⚠️ Resynchro sur un changement venu de l'EXTÉRIEUR seulement — même garde que
  // `DateInput::emitted`, et pour la même raison. Ici l'extérieur existe vraiment :
  // passer de janvier à février RAMÈNE le 31 sur 28, et la colonne des jours doit
  // suivre. Sans ce garde, chaque émission relancerait un défilement sous le doigt.
  const emis = useRef<T>(value);
  useEffect(() => {
    if (value === emis.current) return;
    emis.current = value;
    const i = options.indexOf(value);
    if (i >= 0) ref.current?.scrollTo({ y: i * HAUTEUR_LIGNE, animated: !reduire });
  }, [value, options, reduire]);

  // 🔴 POSITION INITIALE : `scrollTo` AU MONTAGE, ET SURTOUT PAS `contentOffset`.
  // Deuxième no-op web de ce composant, mesuré comme le premier : la prop
  // `contentOffset` n'existe **nulle part** dans react-native-web (0 occurrence
  // dans son `ScrollView`). Une roulette qui s'en sert s'ouvre donc sur sa
  // PREMIÈRE ligne — 2026 pour les années, c'est-à-dire un nouveau-né — alors
  // qu'elle a l'air de marcher : elle défile, elle s'aimante, elle commet. Le
  // défaut ne se voit qu'à l'ouverture, et seulement sur le web.
  // ⚠️ Le prix est une image d'écart au montage sur natif (elle part de la
  // première ligne, puis saute). C'est le bon côté du marché : un saut se voit et
  // se corrige, une date d'ouverture fausse se recopie dans un profil.
  const monte = useRef(false);
  useEffect(() => {
    if (monte.current) return;
    monte.current = true;
    ref.current?.scrollTo({ y: index * HAUTEUR_LIGNE, animated: false });
  }, [index]);

  // 🔴 LE CHOIX SE LIT SUR `onScroll`, PAS SUR `onMomentumScrollEnd` — mesuré dans
  // react-native-web, pas supposé. RNW ne câble au DOM QUE `onScroll`
  // (`ScrollView/index.js:588`) : `onScrollEndDrag` et `onMomentumScrollEnd` y sont
  // définis, appelables… et **jamais déclenchés**. Une roulette bâtie dessus ne
  // commet RIEN sur le web — elle défile, elle s'aimante, elle a l'air de marcher,
  // et la valeur ne change jamais. C'est exactement la famille d'`Alert.alert`,
  // fonction vide sur le web (§11) : aucune erreur, aucune trace, dix interactions
  // mortes. Et le web est la version que les testeurs utilisent.
  // ➡️ Un seul chemin, celui qui existe partout : on lit chaque défilement et on
  // attend qu'il se POSE. Même code natif et web, donc rien à tenir d'accord.
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (settle.current) clearTimeout(settle.current); }, []);

  const defile = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (settle.current) clearTimeout(settle.current);
    // ⚠️ Le délai attend la FIN de l'aimantation, il ne la devine pas : émettre à
    // chaque image ferait passer la colonne des jours par toutes les valeurs
    // survolées, donc re-clamper le jour en pleine course.
    settle.current = setTimeout(() => {
      const i = Math.round(y / HAUTEUR_LIGNE);
      const borne = Math.min(Math.max(i, 0), options.length - 1);
      const choisi = options[borne];
      if (choisi === undefined || choisi === value) return;
      emis.current = choisi;
      onChange(choisi);
    }, POSE_MS);
  };

  return (
    <View style={{ height: HAUTEUR_ROULETTE, width: largeur, flex: largeur ? undefined : 1 }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={HAUTEUR_LIGNE}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={defile}
        // Le libellé de la colonne est porté par l'en-tête au-dessus ; ici on
        // nomme la ROUE, sinon un lecteur d'écran annonce une liste anonyme.
        accessibilityLabel={nom}
        testID={testID}
        contentContainerStyle={{ paddingVertical: MARGE }}
      >
        {options.map((o, i) => (
          <View key={String(o)} style={{ height: HAUTEUR_LIGNE, justifyContent: 'center', alignItems: 'center' }}>
            <Text
              numberOfLines={1}
              style={{
                ...Type.body,
                // La ligne choisie se lit d'un coup d'œil ; les voisines restent
                // lisibles (on doit pouvoir viser la suivante), simplement en retrait.
                color: i === index ? t.text : t.textTertiary,
                fontWeight: i === index ? Type.bodyStrong.fontWeight : Type.body.fontWeight,
              }}
            >
              {libelle ? libelle(o) : String(o)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

/**
 * La bande centrale : elle ne bouge pas, ce sont les chiffres qui défilent
 * dedans.
 *
 * 🔴 ELLE SE REND AVANT LES COLONNES, JAMAIS APRÈS. Elle est pleine
 * (`backgroundColor`), donc posée après elle recouvrirait les chiffres — à
 * `zIndex` égal, c'est l'ordre de rendu qui décide, exactement comme les
 * conteneurs de `Modal` sur le web (§11). Le défaut serait une roulette dont la
 * ligne SÉLECTIONNÉE est la seule illisible.
 * ⚠️ `pointerEvents="none"` par-dessus le marché : posée au milieu, elle est
 * pile là où le doigt se pose.
 */
export function BandeSelection({ t }: { t: ThemePalette }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: 0, right: 0,
        top: MARGE, height: HAUTEUR_LIGNE,
        backgroundColor: t.fill, borderRadius: Radius.sm,
        borderTopWidth: Trait.fin, borderBottomWidth: Trait.fin, borderColor: t.line,
      }}
    />
  );
}
