import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, useWindowDimensions, Animated, Easing,
  type NativeSyntheticEvent, type NativeScrollEvent, type ImageSourcePropType, type LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme, ThemePalette, Spacing, Radius, Type, Trait, cardShadow } from '../constants/theme';
import { useLayout } from '../constants/layout';
import { PrimaryButton } from './ui';
import { Presse } from './Presse';
import { useReduceMotion } from '../lib/reduceMotion';
import { DUREE, dureeReduite } from '../lib/motion';
import { tailleApercu, RATIO_ECRAN } from '../lib/apercuIntro';

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
    texte: 'Tes calories et tes macros du jour. Tu n\'as rien à compter.',
    images: {
      sombre: require('../assets/intro/sombre/1-plan.png'),
      clair: require('../assets/intro/clair/1-plan.png'),
    },
  },
  {
    cle: 'poids',
    titre: 'Ton poids, suivi sans pression',
    texte: 'Une courbe, pas un verdict.',
    images: {
      sombre: require('../assets/intro/sombre/2-poids.png'),
      clair: require('../assets/intro/clair/2-poids.png'),
    },
  },
  {
    cle: 'courses',
    titre: 'Ta liste de courses, prête',
    texte: 'Tout ce qu\'il faut pour ton plan de la semaine.',
    images: {
      sombre: require('../assets/intro/sombre/3-courses.png'),
      clair: require('../assets/intro/clair/3-courses.png'),
    },
  },
  {
    cle: 'recettes',
    titre: 'Des recettes qui s\'adaptent',
    texte: 'Les quantités s\'ajustent à tes macros.',
    images: {
      sombre: require('../assets/intro/sombre/4-recettes.png'),
      clair: require('../assets/intro/clair/4-recettes.png'),
    },
  },
];

/** Toutes les 4 s : assez pour lire un titre, assez peu pour que ça « défile ». */
const CADENCE_MS = 4000;

// 🔴 LA TAILLE DE L'APERÇU NE SE DEVINE PLUS — elle vit dans `lib/apercuIntro.ts`,
// pure et testée. Il y avait ici une part de hauteur (62 %) et une constante
// `ENCOMBREMENT_AUTOUR = 330` censée représenter « le logo, le titre, les points et
// le bouton ». Elle ne comptait ni les encoches, ni le titre : sur le build (17), le
// haut du titre passait sous le logo, tranché net. Cf. l'en-tête du module.

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

  // ── Taille de l'aperçu : MESURÉE, plus devinée ────────────────────────────
  //
  // Une capture d'écran de téléphone est très verticale (430 × 932) : c'est la
  // hauteur qui est la ressource rare. On lit donc ce que le rail offre vraiment et
  // ce que le titre prend vraiment, au lieu de retrancher une constante.
  const { height } = useWindowDimensions();
  const largeurMax = Math.min(width, layout.width) - Spacing.xl * 2;
  const [hauteurRail, setHauteurRail] = useState(0);
  const [hauteurEntete, setHauteurEntete] = useState(0);

  // ⚠️ On garde le PLUS HAUT des quatre en-têtes, pas celui de la diapo courante :
  // sinon l'aperçu changerait de taille d'une diapo à l'autre, et le carrousel
  // sauterait à chaque glissement.
  const surEntete = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    setHauteurEntete((prev) => (h > prev + 0.5 ? h : prev));
  };
  // ⚠️ …mais ce maximum se REMET À ZÉRO quand la fenêtre change (rotation d'iPad,
  // réglage de police système). Sans ça, un en-tête haut mesuré en portrait
  // rapetisserait l'aperçu pour toujours en paysage — un maximum monotone est ce
  // qui empêche la boucle de mesure, pas une vérité éternelle.
  useEffect(() => { setHauteurEntete(0); }, [width, height]);

  const { largeur: largeurImage, hauteur: hauteurImage } = tailleApercu({
    hauteurRail,
    hauteurEntete,
    ecart: Spacing.sm,
    largeurMax,
    hauteurFenetre: height,
  });

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
        onLayout={(e) => setHauteurRail(e.nativeEvent.layout.height)}
        contentContainerStyle={{ alignItems: 'center' }}
      >
        {DIAPOS.map((d) => (
          <View key={d.cle} style={[s.diapo, { width }]}>
            <View style={s.entete} onLayout={surEntete}>
              <Text style={s.titre}>{d.titre}</Text>
              <Text style={s.texte}>{d.texte}</Text>
            </View>
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
    entete: { alignItems: 'center', alignSelf: 'stretch' },
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
