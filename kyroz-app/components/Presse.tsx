import React, { forwardRef, useCallback, useMemo, useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { OPACITE_PRESSION } from '../constants/theme';
import {
  RESSORT, ECHELLE_APPUI, ressortRN, ressortReduit,
} from '../lib/motion';
import { reduceMotionActif } from '../lib/reduceMotion';
import { retour as emettreRetour } from '../lib/retourHaptique';
import type { RoleHaptique } from '../lib/haptique';

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

// 🔴 ET `accessibilityRole` N'AVAIT PAS DE DÉFAUT — trouvé le 2026-09-02, en
// confrontant l'audit UX du 01 à ce dépôt. Son diagnostic (« tout est un `<div>`
// sans rôle ») décrivait le rendu WEB, pas VoiceOver ; mais l'incohérence sous-jacente
// était réelle : sur 144 sites, 132 ne déclaraient AUCUN rôle, 12 déclaraient
// `"button"` à la main. Le composant qui existe PRÉCISÉMENT pour unifier ces 129
// pressables (cf. plus haut) laissait donc son attribut le plus élémentaire
// d'accessibilité à la discrétion de chaque appelant.
//
// ➡️ `accessibilityRole` par défaut à `'button'` — c'est ce que fait CHAQUE site qui
// passe par `Presse` : il répond à un `onPress`. Un appelant qui a besoin d'un rôle
// différent (`MealCard` sert `"link"` pour un renvoi vers une fiche recette) le
// déclare toujours explicitement, et son choix gagne — la valeur par défaut
// n'intervient que si `rest.accessibilityRole` est absent.
//
// ⚠️ RIEN D'AUTRE NE MANQUAIT. `Pressable` (RN) fait déjà le reste tout seul :
// `accessible` vaut `true` sauf refus explicite, et `disabled` se fond automatiquement
// dans `accessibilityState.disabled` — les deux dans `Pressable.js`, pas dans ce
// fichier. Le seul trou était le rôle.

export interface PresseProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /**
   * Compatibilité avec les 129 sites migrés. `1` = pas de retour visuel : c'est
   * la convention déjà en place pour une ligne non cliquable (`MenuRow` en
   * lecture seule), et elle désactive AUSSI l'enfoncement — sinon une ligne
   * inerte s'animerait sous le doigt en promettant une action qui n'existe pas.
   */
  activeOpacity?: number;
  /**
   * Retour au toucher, **à déclarer explicitement** — voir `lib/haptique.ts`.
   *
   * 🔴 IL N'Y A VOLONTAIREMENT PAS DE VALEUR PAR DÉFAUT. Brancher une vibration
   * ici pour les 129 sites d'un coup était l'occasion évidente, et c'est
   * exactement la faute : un retour que l'on sent sur chaque bouton ne signale
   * plus rien, il devient le bruit de fond de l'app (Apple : « use haptics
   * sparingly »). Chaque site qui en veut un le NOMME, et `haptiqueDA` les
   * compte — un `retour` par défaut ferait disparaître ce comptage.
   */
  retour?: RoleHaptique;
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
  {
    style, activeOpacity = OPACITE_PRESSION, disabled, retour, onPressIn, onPressOut,
    accessibilityRole = 'button', ...rest
  },
  ref,
) {
  const echelle = useRef(new Animated.Value(1)).current;
  const opacite = useRef(new Animated.Value(1)).current;
  const inerte = activeOpacity === 1 || !!disabled;

  // 🔴 L'OPACITÉ DE L'APPELANT ÉTAIT ÉCRASÉE, EN SILENCE, SUR SEPT SITES.
  // `style={[style, { opacity: opacite }]}` : la valeur animée vient EN DERNIER, donc
  // elle gagne. Tout `opacity` posé par un appelant ne servait à rien — et c'est
  // toujours le même usage, l'état DÉSACTIVÉ. Mesuré dans le navigateur le 2026-08-27
  // sur « Supprimer définitivement » : `aria-disabled="true"` (il ne réagit pas) et
  // `opacity: 1` (il a l'air actif). **Un bouton qui paraît vivant et ne répond pas est
  // pire qu'un bouton grisé** : on tape, rien ne se passe, rien ne l'explique.
  //
  // Les sept : `ui.tsx` (donc TOUS les boutons principaux désactivés de l'app),
  // `profil.tsx` (suppression de compte), `MacroSplit` ×2 (les ± à leurs bornes),
  // `onboarding.tsx` (le retour à l'étape 1), `MealCard`, `MealSlotsPicker`.
  //
  // ➡️ `opacite` redevient ce qu'elle aurait dû être : un FACTEUR D'APPUI (1 ou
  // `activeOpacity`), MULTIPLIÉ par l'opacité de base de l'appelant. Sans opacité
  // déclarée — les 122 autres sites — le comportement est identique au bit près, et
  // aucun nœud animé supplémentaire n'est créé.
  // ⚠️ `StyleSheet.flatten` parce qu'un `style` est très souvent un TABLEAU ici : lire
  // `style.opacity` directement rendrait `undefined` sur la moitié des appelants, et le
  // correctif aurait l'air posé sans rien corriger.
  const opaciteBase = (StyleSheet.flatten(style) as ViewStyle | undefined)?.opacity;
  const opaciteRendue = useMemo(
    () => (typeof opaciteBase === 'number' && opaciteBase !== 1
      ? Animated.multiply(opacite, opaciteBase)
      : opacite),
    [opacite, opaciteBase],
  );

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
      accessibilityRole={accessibilityRole}
      onPressIn={(e: any) => {
        if (!inerte) {
          animer(ECHELLE_APPUI, RESSORT.appui);
          opacite.setValue(activeOpacity);
          // ⚠️ Sur l'APPUI, avec l'enfoncement — pas au relâchement, et pas dans
          // `onPress`. Le doigt doit sentir au même instant qu'il voit, sinon les
          // deux retours se dédoublent et l'appui paraît mou. Même règle que
          // l'échelle, pour la même raison.
          // ⚠️ Et sous la garde `inerte` : une ligne non cliquable ne vibre pas
          // plus qu'elle ne s'enfonce — elle promettrait une action inexistante.
          if (retour) emettreRetour(retour);
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
      style={[style, { opacity: opaciteRendue, transform: [{ scale: echelle }] }]}
      {...rest}
    />
  );
});
