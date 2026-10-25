import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, LayoutAnimation, Platform, ScrollView, TextInput } from 'react-native';
import { Spacing } from '../constants/theme';

// ── La saisie reste AU-DESSUS du clavier (2026-10-25) ────────────────────────
//
// 🔴 Signalé par le fondateur le 2026-10-23, vidéo à l'appui : Courses → « + » →
// « Ajouter un article ». Le clavier montait PAR-DESSUS la feuille : on voyait le
// champ « Nom », plus la quantité ni le bouton — bloqué. `ActionSheet` n'avait
// AUCUNE gestion du clavier, et `Sheet` non plus : les six éditeurs du Profil, le
// hors-plan, le repas géré par l'utilisateur gardaient leur bouton du bas SOUS le
// clavier. `clavierScrollProps` (ui.tsx) ne couvre que le CONTENU qui défile, pas
// ce qui est posé dessous.
//
// ➡️ Le correctif vit dans le CONTENEUR, une fois : la feuille réserve en bas la
// place que le clavier recouvre, donc tout ce qu'elle porte — champ ET bouton —
// remonte avec lui. Aucune dépendance native (la ligne OTA reste ouverte).
//
// ⚠️ Et c'est pourquoi la feuille COUPE `automaticallyAdjustKeyboardInsets` du
// défilement qu'elle porte, pour le remplacer par `rendreSaisieVisible`. Mesuré
// dans le source de React Native : l'inset natif se calcule UNE fois, sur la
// notification du clavier, donc sur le cadre d'AVANT que la feuille ne rétrécisse.
// Les deux ensemble comptent le clavier deux fois, et le champ ramené « juste
// au-dessus du clavier » finit caché sous le bouton fixe. On ne remonte donc le
// champ qu'APRÈS la mise en page, sur le cadre réel.
//
// ⚠️ iOS seulement. Android redimensionne déjà la fenêtre, et le web n'a pas de
// clavier logiciel qui recouvre la page — le panneau navigateur ne MONTRE donc rien
// de tout ceci : ça se vérifie au simulateur, clavier logiciel affiché.

/**
 * Hauteur de l'écran que le clavier recouvre, en points (0 sans clavier).
 * Suit le clavier à la même vitesse et sur la même courbe que lui — c'est ce que
 * fait `KeyboardAvoidingView` : la feuille monte AVEC lui, pas après.
 */
export function useHauteurClavier(): number {
  const [bas, setBas] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const suivre = (e: any) => {
      const fin = e?.endCoordinates;
      // Lue au moment de l'événement : sur iPad la fenêtre change sans relancer
      // l'app (§11, `Dimensions` lu au chargement ment). Un clavier flottant ou
      // déplacé ne recouvre rien : `screenY` est alors en bas, ou au milieu.
      const h = Dimensions.get('window').height;
      const recouvre = fin ? Math.max(0, h - fin.screenY) : 0;
      if (e?.duration) {
        LayoutAnimation.configureNext({
          duration: e.duration,
          update: { duration: e.duration, type: LayoutAnimation.Types.keyboard },
        });
      }
      setBas(recouvre);
    };
    const subs = [
      Keyboard.addListener('keyboardWillChangeFrame', suivre),
      Keyboard.addListener('keyboardWillHide', (e) => {
        if (e?.duration) {
          LayoutAnimation.configureNext({
            duration: e.duration,
            update: { duration: e.duration, type: LayoutAnimation.Types.keyboard },
          });
        }
        setBas(0);
      }),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return bas;
}

/**
 * Ramène le champ qui a le focus dans la partie VISIBLE du défilement, s'il est
 * dessous. À appeler une fois la mise en page faite (`onLayout` du conteneur
 * rétréci), jamais sur la notification du clavier — cf. l'en-tête.
 */
export function rendreSaisieVisible(scroll: ScrollView | null, marge: number = Spacing.lg): void {
  const champ = TextInput.State.currentlyFocusedInput() as any;
  // `getInnerViewRef` existe sur le ScrollView de RN mais manque à ses types.
  const sv = scroll as any;
  const vue = sv?.getNativeScrollRef?.();
  const interieur = sv?.getInnerViewRef?.();
  if (!champ || !vue || !interieur || !scroll) return;
  vue.measureInWindow((_vx: number, vy: number, _vw: number, vh: number) => {
    champ.measureInWindow((_cx: number, cy: number, _cw: number, ch: number) => {
      const depasse = cy + ch + marge - (vy + vh);
      // Champ hors de ce défilement (en-tête fixe) ou déjà visible : rien à faire.
      if (depasse <= 0 || cy < vy) return;
      champ.measureLayout(interieur, (_x: number, yContenu: number) => {
        const decalage = yContenu - (cy - vy);
        scroll.scrollTo({ y: decalage + depasse, animated: true });
      }, () => {});
    });
  });
}
