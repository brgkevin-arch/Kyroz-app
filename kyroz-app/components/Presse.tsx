import React, { forwardRef, useCallback, useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import { OPACITE_PRESSION } from '../constants/theme';
import {
  RESSORT, ECHELLE_APPUI, ressortRN, ressortReduit,
} from '../lib/motion';
import { reduceMotionActif } from '../lib/reduceMotion';

// ── Un bouton pressé s'ENFONCE, il ne se contente pas de pâlir ───────────────
//
// Mesuré le 2026-08-10 : **129 éléments pressables**, et le seul retour au doigt
// de toute l'app était `activeOpacity: 0,7`. Apple, lui, enfonce — l'échelle
// descend à 0,97 sous le doigt et remonte au ressort quand il part. La
// différence n'est pas décorative : l'opacité dit « j'ai noté », l'échelle dit
// « tu appuies », et c'est la seconde qui donne la sensation de matière.
//
// 🔴 ET LE RETOUR ARRIVE SUR L'APPUI, JAMAIS AU RELÂCHEMENT. C'est la première
// règle du catalogue Apple : dès qu'un délai s'installe entre le doigt et la
// réponse, la sensation de direct « tombe d'une falaise ». `TouchableOpacity`
// le faisait déjà pour l'opacité ; ce composant ne fait que lui ajouter la
// dimension qui manquait, au même instant.
//
// ⚠️ POURQUOI `Pressable` ET PAS `TouchableOpacity`. Le comptage disait
// **129 `TouchableOpacity` contre 10 `Pressable`** — or c'est `Pressable` qui
// expose l'état pressé, donc le seul qui puisse piloter autre chose que
// l'opacité. Le composant conserve volontairement la même surface d'API
// (`onPress`, `style`, `disabled`, `hitSlop`, `activeOpacity`) pour que la
// migration des 129 sites soit MÉCANIQUE : un remplacement de balise, aucune
// réécriture de logique. Une migration qui demande de réfléchir site par site
// est une migration qu'on ne finit pas.
//
// ⚠️ `forwardRef` n'est pas décoratif : la visite guidée ancre ses bulles sur
// des refs posées directement sur des pressables (`MenuRow`, cf. le commentaire
// dans `ui.tsx`). Sans elle, une étape de tour perdrait sa cible — et une cible
// absente est écartée EN SILENCE, donc le tour se jouerait plus court en ayant
// l'air complet.

export interface PresseProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /**
   * Compatibilité avec les 129 sites migrés. `1` = pas de retour visuel : c'est
   * la convention déjà en place pour une ligne non cliquable (`MenuRow` en
   * lecture seule), et elle désactive AUSSI l'enfoncement — sinon une ligne
   * inerte s'animerait sous le doigt en promettant une action qui n'existe pas.
   */
  activeOpacity?: number;
}

// 🔴 LE `Pressable` LUI-MÊME EST ANIMÉ — PAS UNE VUE POSÉE À L'INTÉRIEUR.
// La première version enveloppait les enfants dans une `Animated.View`, et
// elle aurait cassé la mise en page des 129 sites d'un coup : le `style` d'un
// pressable porte presque toujours un `flexDirection`, un `gap`, un `flex: 1`,
// et ces règles s'appliquent à ses ENFANTS DIRECTS. Une vue intermédiaire les
// aurait tous regroupés en un seul enfant — donc une rangée icône + texte
// serait devenue une colonne, partout, sans qu'aucun test ne le voie.
// ⚠️ Le prix, assumé : la zone tactile se réduit de 3 % pendant l'appui. C'est
// ce que fait iOS lui-même, et `hitSlop` reste disponible là où la cible est
// petite.
const PressableAnime = Animated.createAnimatedComponent(Pressable);

export const Presse = forwardRef<any, PresseProps>(function Presse(
  { style, activeOpacity = OPACITE_PRESSION, disabled, onPressIn, onPressOut, ...rest },
  ref,
) {
  const echelle = useRef(new Animated.Value(1)).current;
  const opacite = useRef(new Animated.Value(1)).current;
  const inerte = activeOpacity === 1 || !!disabled;

  const animer = useCallback((vers: number, ressort: typeof RESSORT.appui) => {
    // ⚠️ Le réglage d'accessibilité se lit À CHAQUE APPUI, depuis le store — pas
    // capturé au montage. Un bouton monté avant que l'utilisateur ne bascule
    // « Réduire les animations » doit obéir tout de suite, pas au prochain
    // démarrage. C'est le défaut « un réglage ne se relit pas, il se diffuse »
    // (CLAUDE.md §11), et il est trop facile à réintroduire ici.
    const reduire = reduceMotionActif();
    Animated.spring(echelle, {
      toValue: reduire ? 1 : vers,
      useNativeDriver: true,
      ...ressortRN(ressortReduit(ressort, reduire)),
    }).start();
  }, [echelle]);

  return (
    <PressableAnime
      ref={ref}
      disabled={disabled}
      onPressIn={(e: any) => {
        if (!inerte) {
          animer(ECHELLE_APPUI, RESSORT.appui);
          opacite.setValue(activeOpacity);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e: any) => {
        if (!inerte) {
          animer(1, RESSORT.relache);
          opacite.setValue(1);
        }
        onPressOut?.(e);
      }}
      // L'opacité RESTE en plus de l'échelle, elle ne la remplace pas : sur un
      // fond sombre, 3 % d'échelle se remarquent peu, et c'est justement le
      // contexte de Kyroz. Les deux ensemble donnent un retour lisible partout.
      style={[style, { opacity: opacite, transform: [{ scale: echelle }] }]}
      {...rest}
    />
  );
});
