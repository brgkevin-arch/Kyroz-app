import React, { Children, Fragment, cloneElement, isValidElement, useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import { CASCADE, DUREE, RESSORT, delaiCascade, dureeReduite, ressortReduit, ressortRN } from '../lib/motion';
import { reduceMotionActif } from '../lib/reduceMotion';

/**
 * Un élément qui ENTRE : fondu + légère montée (ou descente quand on revient en
 * arrière), au montage. Le déplacement est un ressort `pose` — aucun dépassement,
 * rien n'a été lancé par un doigt — et l'opacité un fondu `Easing.out`.
 *
 * ⚠️ Réduire les animations : on garde le fondu (il INFORME), on retire le
 * glissement (il DÉPLACE). Lu au montage via `reduceMotionActif`, qui suit le
 * réglage en direct.
 */
export function Apparition({
  delai = 0, sens = 1, style, onLayout, children,
}: {
  delai?: number;
  /** 1 = monte depuis le bas (on avance), −1 = descend depuis le haut (on revient). */
  sens?: 1 | -1;
  style?: StyleProp<ViewStyle>;
  onLayout?: (e: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  const reduire = reduceMotionActif();
  const opacite = useRef(new Animated.Value(0)).current;
  const decalage = useRef(new Animated.Value(reduire ? 0 : sens * CASCADE.glissement)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacite, {
        toValue: 1,
        duration: dureeReduite(DUREE.moyen, reduire),
        delay: delai,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(decalage, {
        toValue: 0,
        delay: delai,
        ...ressortRN(ressortReduit(RESSORT.pose, reduire)),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
    // Une entrée se joue UNE fois, au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View onLayout={onLayout} style={[style, { opacity: opacite, transform: [{ translateY: decalage }] }]}>
      {children}
    </Animated.View>
  );
}

/** Les enfants réels, fragments dépliés : `{sex && (<>…</>)}` donne trois champs, pas un bloc. */
function aplatir(children: React.ReactNode): React.ReactElement[] {
  const sortie: React.ReactElement[] = [];
  Children.toArray(children).forEach((c) => {
    if (!isValidElement(c)) return;
    if (c.type === Fragment) {
      const cles = aplatir((c.props as { children?: React.ReactNode }).children);
      cles.forEach((e) => sortie.push(cloneElement(e, { key: `${String(c.key)}/${String(e.key)}` })));
    } else sortie.push(c);
  });
  return sortie;
}

/**
 * Un bloc de page dont les enfants entrent EN CASCADE (`lib/motion.ts::CASCADE`).
 * Un enfant qui apparaît plus tard — une question dévoilée par un choix — entre
 * aussitôt, avec le même geste.
 *
 * ⚠️ Chaque enfant est enveloppé : le `gap` du bloc s'applique donc aux
 * enveloppes, comme avant aux enfants. Et un `onLayout` posé sur un enfant
 * REMONTE sur son enveloppe — sinon sa position mesurée deviendrait 0 (relative à
 * l'enveloppe), et le défilement automatique des préférences viserait le haut
 * de la page.
 */
export function BlocCascade({
  style, sens = 1, onLayout, children,
}: {
  style?: StyleProp<ViewStyle>;
  sens?: 1 | -1;
  onLayout?: (e: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  const monte = useRef(Date.now()).current;
  const reduire = reduceMotionActif();
  const depuis = Date.now() - monte;
  return (
    <View style={style} onLayout={onLayout}>
      {aplatir(children).map((enfant, i) => {
        const props = enfant.props as { onLayout?: (e: LayoutChangeEvent) => void };
        const surMesure = props.onLayout;
        const nu = surMesure ? cloneElement(enfant as React.ReactElement<{ onLayout?: unknown }>, { onLayout: undefined }) : enfant;
        return (
          <Apparition key={enfant.key ?? i} delai={delaiCascade(i, depuis, reduire)} sens={sens} onLayout={surMesure}>
            {nu}
          </Apparition>
        );
      })}
    </View>
  );
}
