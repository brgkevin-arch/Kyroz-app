// ── Interrupteurs de parcours ────────────────────────────────────────────────
//
// UN SEUL FICHIER fait foi pour « cette fonction est-elle ouverte à l'utilisateur ? ».
// C'est le point de vérité demandé par l'inventaire du 2026-08-18 : les gardes étaient
// en train de se disperser dans les modules qu'elles éteignent, ce qui rend impossible
// de répondre à « qu'est-ce qui est éteint aujourd'hui ? » sans lire toute l'app.
//
// ⚠️ DEUX CONSTANTES, PAS UNE — et c'est délibéré, contre la formulation initiale
// (« un feature flag unique »). Les deux parcours ont été arbitrés SÉPARÉMENT, à deux
// jours d'intervalle ; un interrupteur commun interdirait d'en rallumer un sans
// l'autre. Le point de vérité est unique, la décision reste divisible.
//
// ⚠️ CE QUI EST ÉTEINT N'EST PAS SUPPRIMÉ. Les moteurs, les modules, les composants et
// leurs tests restent en place et verts. Repasser une constante à `true` rallume le
// parcours — voir le mot-clé de chaque constante pour les points qu'elle ne garde pas.

/**
 * « J'ai mangé hors plan » — bouton de l'écran Plan, feuille de saisie, recalage
 * du jour, ligne « Écarts passés » du Profil. **Éteint le 2026-08-18.**
 *
 * ⚠️ NE GARDE PAS l'étape de visite guidée `plan-offplan` ni son `useTourTarget` :
 * ils ont été RETIRÉS avec le bouton, parce qu'une bulle dont la cible n'est pas
 * montée assombrit l'écran sans bulle ni « Passer », donc sans sortie (AGENTS.md E50).
 * À remettre à la main — leur texte est conservé en commentaire dans `lib/tours.ts`.
 */
export const PARCOURS_HORS_PLAN_ACTIF = false;

/**
 * « Jours plus copieux » (ex-« banque de calories ») — ligne et éditeur du Profil.
 * **Éteint le 2026-08-18**, après avoir été dégaté et renommé le même jour.
 *
 * ⚠️ IL COUPE AUSSI LA LECTURE DE LA DONNÉE, pas seulement l'écran, et c'est le
 * point important : `planEngine::bankOf` rend `undefined` quand il est à `false`.
 * Sans ça, un compte portant déjà « samedi +600 » garderait une semaine déformée
 * par un réglage qu'aucun écran ne montre plus et que personne ne peut annuler —
 * exactement le défaut qu'on venait de corriger (l'écart orphelin affiché).
 *
 * ⚠️ Le MOTEUR, lui, ne bouge pas : `lib/calorieBank.ts` et ses 23 tests restent
 * intacts, et `bankedTargets` avec une banque vide est l'identité.
 *
 * ⚠️ Aucun `ENGINE_VERSION` n'a été incrémenté, et c'est justifié : `calorie_bank`
 * entre dans `profileSignature` (`cb`), qui passe donc de la banque à `null` pour
 * les comptes concernés — leur plan en cache s'invalide tout seul. Un compte sans
 * banque ne voit strictement rien changer.
 */
export const RYTHME_HEBDOMADAIRE_ACTIF = false;
