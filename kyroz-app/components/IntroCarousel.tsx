import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Animated, Easing,
  type NativeSyntheticEvent, type NativeScrollEvent, type ImageSourcePropType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Trait, cardShadow } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { PrimaryButton } from './ui';
import { Presse } from './Presse';
import { useReduceMotion } from '../lib/reduceMotion';
import { DUREE, dureeReduite } from '../lib/motion';

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
  },
  {
    cle: 'poids',
    titre: 'Ton poids, suivi sans pression',
    texte: 'Une courbe, pas un verdict. Le plan se recale tout seul sur ce qu\'elle dit.',
    images: {
      sombre: require('../assets/intro/sombre/2-poids.png'),
      clair: require('../assets/intro/clair/2-poids.png'),
    },
  },
  {
    cle: 'courses',
    titre: 'Ta liste de courses, prête',
    texte: 'Tout ce qu\'il te faut pour la semaine, rangé par rayon, avec les quantités.',
    images: {
      sombre: require('../assets/intro/sombre/3-courses.png'),
      clair: require('../assets/intro/clair/3-courses.png'),
    },
  },
  {
    cle: 'recettes',
    titre: 'Des recettes qui s\'adaptent',
    texte: 'Les quantités s\'ajustent à TES macros — pas à toi de t\'ajuster aux leurs.',
    images: {
      sombre: require('../assets/intro/sombre/4-recettes.png'),
      clair: require('../assets/intro/clair/4-recettes.png'),
    },
  },
];

/** Toutes les 4 s : assez pour lire un titre, assez peu pour que ça « défile ». */
const CADENCE_MS = 4000;

// Les captures montrent l'écran ENTIER (`test/intro-captures.mjs`, gabarit 430 × 932
// — le rendu téléphone garanti, cf. `lib/layout.ts`). Un seul ratio pour les quatre.
const RATIO_ECRAN = 430 / 932;

// La diapo occupe ~62 % de la hauteur : assez pour qu'on reconnaisse un écran d'app,
// assez peu pour que le titre et le bouton restent posés autour sans se serrer.
const PART_HAUTEUR = 0.62;

// ⚠️ …mais jamais au point d'écraser le reste. Sur un écran court (SE, 667 pt), 62 %
// ne laisserait pas la place au logo, au titre, aux points et au bouton : on retire
// donc leur encombrement mesuré avant de prendre la part. Sans ce plancher, la diapo
// pousserait le bouton hors de l'écran — un accueil dont on ne peut plus sortir, ce
// que ce fichier existe justement pour interdire.
const ENCOMBREMENT_AUTOUR = 330;

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

  // ── LA SORTIE : ON ENTRE DANS L'APP, ON NE COUPE PAS AU MONTAGE ────────────
  //
  // 0 = en place, 1 = parti. L'accueil s'AGRANDIT en s'effaçant (1 → 1,04) et le
  // formulaire arrive en grandissant lui aussi (0,96 → 1) : deux mouvements dans le
  // MÊME sens, ce qui se lit comme une avancée. L'inverse — l'accueil qui rétrécit —
  // se lirait comme un retour en arrière.
  //
  // ⚠️ Ce budget de mouvement se justifie parce que cet écran est vu UNE FOIS par
  // appareil (`@kyroz:introVue`). Le formulaire, lui, est revu à chaque connexion :
  // il n'est animé QUE lorsqu'on arrive d'ici, jamais sur une visite ordinaire.
  const sortie = useRef(new Animated.Value(0)).current;
  const enSortie = useRef(false);

  const partir = () => {
    // Un second tap pendant la sortie relancerait l'animation depuis le début et
    // rappellerait `onTermine`. Le geste est unique, la garde aussi.
    if (enSortie.current) return;
    enSortie.current = true;
    Animated.timing(sortie, {
      toValue: 1,
      duration: dureeReduite(DUREE.court, reduire),
      // `Easing.out` : l'écran part vite puis s'apaise. `Easing.in` retarderait
      // l'instant exact que l'œil regarde — le départ.
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // 🔴 ON PASSE LA MAIN MÊME SI L'ANIMATION EST INTERROMPUE. `finished` est faux
      // quand la vue se démonte en cours de route ; ne rendre la main que sur `true`
      // laisserait quelqu'un coincé sur un accueil à demi effacé, sans bouton — le
      // défaut exact que ce composant existe pour interdire.
      void finished;
      onTermine();
    });
  };

  // En mouvement réduit, l'échelle disparaît et le fondu reste : « moins et plus
  // doux », jamais « rien » — un saut sec est ce que le réglage cherche à éviter.
  const styleSortie = {
    opacity: sortie.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    transform: reduire ? [] : [{
      scale: sortie.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }),
    }],
  };

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

  // ── Taille de l'aperçu : on part de la HAUTEUR, pas de la largeur ──────────
  //
  // Une capture d'écran de téléphone est très verticale (430 × 932). La dimensionner
  // par la largeur disponible la ferait déborder en hauteur sur n'importe quel
  // appareil ; c'est la hauteur qui est la ressource rare ici.
  const { height } = useWindowDimensions();
  const largeurMax = Math.min(width, layout.width) - Spacing.xl * 2;
  const hauteurVoulue = Math.min(height * PART_HAUTEUR, height - ENCOMBREMENT_AUTOUR);
  // …et si la largeur venait à manquer malgré tout (écran très court et large, ou
  // grande police système), c'est elle qui décide : l'image se contente de rétrécir.
  const hauteurImage = Math.max(
    120,
    Math.min(hauteurVoulue, largeurMax / RATIO_ECRAN),
  );
  const largeurImage = hauteurImage * RATIO_ECRAN;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />

      {/* ⚠️ La vue animée est À L'INTÉRIEUR de la `SafeAreaView`, et elle porte
          `justifyContent: 'space-between'` à sa place : animer la `SafeAreaView`
          elle-même ferait entrer les encoches dans l'échelle, et le contenu
          déborderait sous la barre d'état pendant la sortie. */}
      <Animated.View style={[s.corps, styleSortie]}>
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
                height: hauteurImage,
                borderRadius: Radius.card,
                overflow: 'hidden',
                // 🔴 UNE ARÊTE, DANS LES DEUX THÈMES — et c'est l'inverse de ce que
                // j'avais écrit ici. J'avais retiré la bordure en jugeant qu'un cadre
                // « colle l'aperçu à la page ». Vu à l'écran le 2026-09-07 : c'est
                // faux quand l'image montre la PAGE ENTIÈRE, parce que son fond est
                // alors exactement celui de l'écran qui l'accueille. Sans arête,
                // l'aperçu ne flotte pas — il se dissout, et on ne voit plus où l'app
                // commence.
                // `cardShadow` d'abord (ombre en clair, où elle se voit ; rien à
                // ajouter en sombre, où elle serait invisible), le filet ENSUITE pour
                // qu'il gagne dans les deux cas.
                ...cardShadow(t),
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
        <PrimaryButton t={t} label="Commencer" onPress={partir} />
      </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    corps: { flex: 1, justifyContent: 'space-between' },
    // KYROZ au même rang que sur l'écran suivant (`login.tsx` : `Type.display`,
    // interlettrage 6) — l'accueil et le formulaire ne sont pas deux applications, et
    // c'est le NOM qui doit tenir le haut de l'écran, pas le titre de la diapo.
    logo: {
      ...Type.display, color: t.text, letterSpacing: 6, textAlign: 'center',
      marginTop: Spacing.lg, marginBottom: Spacing.md,
    },
    diapo: { paddingHorizontal: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
    // `h2` et non `h1` : le titre accompagne l'aperçu, il ne lui dispute pas la
    // place. C'est l'image qui porte la démonstration.
    titre: { ...Type.h2, color: t.text, textAlign: 'center' },
    texte: {
      ...Type.body, color: t.textSecondary, textAlign: 'center',
      lineHeight: 21, marginBottom: Spacing.sm,
    },
    points: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.md },
    point: { width: 7, height: 7, borderRadius: 4, backgroundColor: t.textTertiary },
    pied: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  });
}
