import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, useWindowDimensions,
  type NativeSyntheticEvent, type NativeScrollEvent, type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Trait } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { PrimaryButton } from './ui';
import { Presse } from './Presse';
import { useReduceMotion } from '../lib/reduceMotion';

// ── CE QUE KYROZ FAIT, MONTRÉ AVANT DE DEMANDER QUOI QUE CE SOIT ─────────────
//
// 🔴 LE DÉFAUT QUE CET ÉCRAN FERME : le tout PREMIER écran d'un utilisateur réel
// était un formulaire e-mail + mot de passe, à froid. « Continuer en invité » — la
// seule porte pour essayer avant de créer un compte — est encadré `__DEV__`, donc
// invisible en production. Le plan réel n'apparaissait qu'après le compte créé ET
// les sept étapes d'inscription.
//
// ⚠️ LES IMAGES SONT DES CAPTURES RÉELLES, ET ELLES SE REGÉNÈRENT PAR SCRIPT
// (`test/intro-captures.mjs`, `npm run captures:intro`). Une image d'app fige
// l'app au jour où elle est prise et continue d'avoir l'air à jour — sur le
// premier écran, ce serait le pire endroit pour mentir. Le cadrage lui-même est
// calculé depuis la position RÉELLE des éléments, jamais des pixels en dur.
//
// ⚠️ ET IL Y EN A DEUX JEUX, UN PAR THÈME. Une image ne suit pas le thème du
// lecteur : servir la version sombre à un écran clair poserait un rectangle noir
// au milieu de la page — le défaut de contraste que la palette vient de fermer,
// réintroduit en image.

type Diapo = {
  cle: string;
  titre: string;
  texte: string;
  images: { sombre: ImageSourcePropType; clair: ImageSourcePropType };
  /** Ratio largeur/hauteur de la capture — fixe la place à réserver sans la mesurer. */
  ratio: number;
};

// ⚠️ `require` ne prend QUE des chemins littéraux : Metro résout ces images à la
// compilation. Une table construite dynamiquement (`require(`../assets/${x}.png`)`)
// ne compile pas — d'où cette liste explicite, qui a l'avantage de rendre visible
// tout ce que le carrousel embarque.
const DIAPOS: Diapo[] = [
  {
    cle: 'plan',
    titre: 'Ton plan, décidé pour toi',
    texte: 'Tes calories et tes macros du jour, déjà calculées. Tu n\'as rien à compter.',
    images: {
      sombre: require('../assets/intro/sombre/1-plan.png'),
      clair: require('../assets/intro/clair/1-plan.png'),
    },
    ratio: 414 / 230,
  },
  {
    cle: 'poids',
    titre: 'Ton poids, suivi sans pression',
    texte: 'Une courbe, pas un verdict. Le plan se recale tout seul sur ce qu\'elle dit.',
    images: {
      sombre: require('../assets/intro/sombre/2-poids.png'),
      clair: require('../assets/intro/clair/2-poids.png'),
    },
    ratio: 414 / 356,
  },
  {
    cle: 'courses',
    titre: 'Ta liste de courses, prête',
    texte: 'Tout ce qu\'il te faut pour la semaine, rangé par rayon, avec les quantités.',
    images: {
      sombre: require('../assets/intro/sombre/3-courses.png'),
      clair: require('../assets/intro/clair/3-courses.png'),
    },
    ratio: 414 / 430,
  },
  {
    cle: 'recettes',
    titre: 'Des recettes qui s\'adaptent',
    texte: 'Les quantités s\'ajustent à TES macros — pas à toi de t\'ajuster aux leurs.',
    images: {
      sombre: require('../assets/intro/sombre/4-recettes.png'),
      clair: require('../assets/intro/clair/4-recettes.png'),
    },
    ratio: 414 / 470,
  },
];

/** Toutes les 4 s : assez pour lire un titre, assez peu pour que ça « défile ». */
const CADENCE_MS = 4000;

export function IntroCarousel({ onTermine }: { onTermine: () => void }) {
  const t = useTheme();
  const layout = useLayout();
  const { width } = useWindowDimensions();
  const reduire = useReduceMotion();
  const s = React.useMemo(() => makeStyles(t), [t]);

  const [index, setIndex] = useState(0);
  const railRef = useRef<ScrollView>(null);
  // 🔴 UNE FOIS QUE LA MAIN A PARLÉ, L'AUTOMATIQUE SE TAIT — DÉFINITIVEMENT. Un
  // carrousel qui reprend son défilement pendant qu'on lit une diapo la reprend des
  // mains : le geste de l'utilisateur doit gagner, et gagner pour de bon.
  const mainPrise = useRef(false);

  useEffect(() => {
    // `reduceMotion` coupe l'avance automatique, il ne la ralentit pas : un
    // mouvement qu'on n'a pas demandé est exactement ce que ce réglage refuse.
    if (reduire || mainPrise.current) return;
    const minuteur = setTimeout(() => {
      if (mainPrise.current) return;
      const suivant = (index + 1) % DIAPOS.length;
      // 🔴 ON DEMANDE LE DÉFILEMENT, ON NE DÉCRÈTE PAS L'INDEX. La première version
      // faisait `setIndex(suivant)` ici : les points avançaient tout de suite,
      // indépendamment du rail. Vu à l'écran le 2026-09-04 — le 3ᵉ point était actif
      // au-dessus de la diapo 1. L'index est désormais DÉRIVÉ de la position réelle
      // (`onScroll`), donc un défilement qui n'aboutit pas laisse les points en
      // place : ils ne peuvent plus mentir sur ce qu'on regarde.
      // ⚠️ `y: 0` est requis par react-native-web — sans lui, `scrollTo` est un no-op.
      railRef.current?.scrollTo({ x: suivant * width, y: 0, animated: true });
    }, CADENCE_MS);
    return () => clearTimeout(minuteur);
  }, [index, width, reduire]);

  const surDefilement = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  // Largeur utile d'une image : la diapo, moins les marges de contenu.
  const largeurImage = Math.min(width, layout.width) - Spacing.xl * 2;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />

      <Text style={s.logo}>KYROZ</Text>

      <ScrollView
        ref={railRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={() => { mainPrise.current = true; }}
        // `onScroll` ET `onMomentumScrollEnd` : le premier tient les points collés au
        // rail pendant tout le mouvement, le second rattrape les plateformes où le
        // flux d'événements s'arrête avant la fin de l'inertie.
        onScroll={surDefilement}
        onMomentumScrollEnd={surDefilement}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {DIAPOS.map((d) => (
          <View key={d.cle} style={[s.diapo, { width }]}>
            <Text style={s.titre}>{d.titre}</Text>
            <Text style={s.texte}>{d.texte}</Text>
            <Image
              source={t.scheme === 'dark' ? d.images.sombre : d.images.clair}
              style={{
                width: largeurImage,
                height: largeurImage / d.ratio,
                borderRadius: Radius.card,
                borderWidth: Trait.fin,
                borderColor: t.line,
              }}
              // `contain` et pas `cover` : une capture recadrée ne se recadre pas une
              // seconde fois. `cover` rognerait le chiffre qu'elle existe pour montrer.
              resizeMode="contain"
              accessibilityIgnoresInvertColors
              accessible
              accessibilityLabel={`Aperçu de l'écran : ${d.titre}`}
            />
          </View>
        ))}
      </ScrollView>

      {/* `tablist` : le conteneur d'onglets. Sans lui, quatre `tab` orphelins — un
          rôle d'enfant sans son parent n'est pas une structure, c'est un mot. */}
      <View style={s.points} accessibilityRole="tablist">
        {DIAPOS.map((d, i) => (
          <Presse
            key={d.cle}
            onPress={() => {
              mainPrise.current = true;
              railRef.current?.scrollTo({ x: i * width, y: 0, animated: !reduire });
              setIndex(i);
            }}
            hitSlop={8}
            // 🔴 `tab` + `aria-selected`, ET LES DEUX ONT ÉTÉ MESURÉS. L'état « point
            // actif » n'existait d'abord que pour l'œil :
            //  · `accessibilityState={{ selected }}` ne rend RIEN sur le web —
            //    react-native-web 0.21 ne lit pas `accessibilityState` du tout, il
            //    attend `aria-selected` (`modules/createDOMProps`) ;
            //  · `aria-selected` sur un rôle `button` n'est pas de l'ARIA valide, donc
            //    le rôle devait changer aussi. `tab` est celui d'une pagination.
            // `aria-selected` couvre les DEUX plateformes : RN natif le replie
            // lui-même dans `accessibilityState` (`Pressable.js:232`).
            accessibilityRole="tab"
            accessibilityLabel={`Aller à « ${d.titre} »`}
            aria-selected={i === index}
          >
            <View style={[s.point, i === index && { backgroundColor: t.text, width: 20 }]} />
          </Presse>
        ))}
      </View>

      <View style={[s.pied, layout.content]}>
        {/* 🔴 TOUJOURS ACTIF, JAMAIS CONDITIONNÉ À LA DERNIÈRE DIAPO. Il y a eu ici un
            écran « Avant de commencer » qui ne rendait son bouton qu'une fois ses
            questions répondues : il est devenu INFRANCHISSABLE et a été retiré le
            2026-08-12 (cf. la note `passScreening` dans `test/_harness.mjs`). Un
            écran d'accueil qui retient quelqu'un n'accueille pas, il barre. */}
        <PrimaryButton t={t} label="Commencer" onPress={onTermine} />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg, justifyContent: 'space-between' },
    logo: {
      ...Type.h2, color: t.text, letterSpacing: 5, textAlign: 'center',
      marginTop: Spacing.xl, marginBottom: Spacing.lg,
    },
    diapo: { paddingHorizontal: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
    titre: { ...Type.h1, color: t.text, textAlign: 'center' },
    texte: {
      ...Type.body, color: t.textSecondary, textAlign: 'center',
      lineHeight: 21, marginBottom: Spacing.sm,
    },
    points: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
    point: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.textTertiary },
    pied: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  });
}
