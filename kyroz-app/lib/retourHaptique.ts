import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { PRIMITIVE, doitEmettre, type RoleHaptique } from './haptique';

// ── Le câblage du retour au toucher ──────────────────────────────────────────
//
// La décision vit dans `lib/haptique.ts`, pur et testé. Ici, rien d'autre que le
// branchement au natif — et les deux précautions qui empêchent un retour au
// toucher de casser quoi que ce soit.
//
// 🔴 1. ON NE L'ATTEND JAMAIS. Toutes les fonctions d'`expo-haptics` sont `async`.
// Les attendre insérerait un aller-retour natif **avant** l'effet du geste : le
// bouton répondrait après la vibration au lieu d'avec elle, et un appui rapide
// paraîtrait mou. Le retour part en parallèle de l'action, jamais devant.
//
// 🔴 2. UN ÉCHEC EST TOUJOURS SILENCIEUX. Un moteur haptique absent, un émulateur,
// un Android sans `VIBRATE` : l'appel rejette. Une promesse rejetée non capturée
// remonte en `unhandledrejection` — donc une vibration ratée pourrait faire
// remonter une erreur dans un écran qui, lui, marchait très bien. Le retour au
// toucher est un CONFORT : il n'a le droit de rien casser, pas même un log.
//
// 🔴 ET CETTE PRÉCAUTION VAUT PLUS QUE SA PRUDENCE : ELLE A DÉMENTI UNE
// AFFIRMATION. Le 2026-08-11, en ouvrant ce chantier, il était annoncé qu'ajouter
// `expo-haptics` « fermerait la voie OTA » jusqu'au prochain build — un module
// natif absent du binaire, donc une app qui casse. **Mesuré, c'est faux.** Sur le
// simulateur, dont le dev client ne contient PAS `ExpoHaptics` (vérifié :
// 0 occurrence dans `ios/Podfile.lock`), cocher un repas fonctionne et l'app tient
// debout. Deux mécanismes s'additionnent, et il fallait les distinguer pour ne pas
// attribuer le mérite au mauvais :
//   • le paquet utilise `requireOptionalNativeModule`, qui rend `null` au lieu de
//     lever — **l'import ne crashe donc pas**, ce qui est le gros du risque ;
//   • mais `notificationAsync` LÈVE un `UnavailabilityError` dans une fonction
//     `async`, donc elle **rejette** — et c'est le `.catch` ci-dessous, lui seul,
//     qui empêche un `unhandledrejection` à chaque appui.
// ➡️ Conséquence pratique : ce lot est **publiable en OTA**. Sur les binaires
// d'avant il ne vibrera simplement pas, et il s'activera de lui-même au build
// 1.0.0 (4). ⚠️ Retirer le `.catch` reprendrait ce droit sans rien afficher de
// rouge — d'où le garde-fou qui le compte dans `haptiqueDA`.

const APPEL: Record<string, () => Promise<void>> = {
  selection: () => Haptics.selectionAsync(),
  succes: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  erreur: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  impactLeger: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
};

/**
 * Émet le retour au toucher qui va avec ce moment. Ne rend rien, n'attend rien,
 * ne lève jamais.
 *
 * ℹ️ Le réglage « Retour haptique du système » d'iOS est respecté par le système
 * lui-même — il n'y a rien à lire ici (cf. la note de `lib/haptique.ts`).
 */
export function retour(role: RoleHaptique): void {
  if (!doitEmettre(Platform.OS)) return;
  try {
    APPEL[PRIMITIVE[role]]?.().catch(() => {});
  } catch {
    /* le confort ne casse rien */
  }
}
