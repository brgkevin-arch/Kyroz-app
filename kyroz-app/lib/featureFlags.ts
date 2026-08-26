// ── Interrupteurs de parcours ────────────────────────────────────────────────
//
// UN SEUL FICHIER fait foi pour « cette fonction est-elle ouverte à l'utilisateur ? ».
// C'est le point de vérité demandé par l'inventaire du 2026-08-18 : les gardes étaient
// en train de se disperser dans les modules qu'elles éteignent, ce qui rend impossible
// de répondre à « qu'est-ce qui est éteint aujourd'hui ? » sans lire toute l'app.
//
// ⚠️ UNE CONSTANTE PAR DÉCISION, PAS UN INTERRUPTEUR COMMUN — délibéré, contre la
// formulation initiale (« un feature flag unique »). Chaque parcours a été arbitré
// SÉPARÉMENT ; un interrupteur commun interdirait d'en rallumer un sans les autres. Le
// point de vérité est unique, la décision reste divisible. (Elles étaient deux le
// 2026-08-18, trois depuis l'extinction des statistiques d'usage le 2026-08-26.)
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

/**
 * **Statistiques d'usage (PostHog)** — l'écran de consentement, l'interrupteur des
 * Réglages, et l'envoi lui-même. **Éteint le 2026-08-26** (décision fondateur :
 * « on enlève le posthog pour l'instant »).
 *
 * ⚠️ IL COUPE L'ENVOI EN PREMIER, avant même la lecture du consentement. C'est ce
 * qui rend l'extinction vraie sur un binaire DÉJÀ INSTALLÉ : la clé y est inlinée à
 * la compilation, donc la retirer de l'environnement EAS ne concerne que les builds
 * FUTURS. Seul un code qui refuse de partir arrête ce qui est chez les testeurs —
 * et il se publie en OTA.
 *
 * ⚠️ CE QUI RESTE, ET CE N'EST PAS UN OUBLI : la ligne « Supprimer mes statistiques »
 * des Réglages, tant qu'un pseudonyme existe sur l'appareil. Des mesures ont pu
 * partir entre la pose de la clé (2026-08-18) et aujourd'hui ; le droit à
 * l'effacement ne s'éteint pas avec la collecte. Retirer ce bouton en même temps que
 * le reste ferait disparaître le seul chemin de suppression, pour les seules
 * personnes qui en ont besoin.
 *
 * ⚠️ Le périmètre reste GARDÉ pour le jour où il revient : `lib/analytics.ts`, ses
 * 15 events et `analyticsPerimetre.test.ts` ne bougent pas. Repasser cette constante
 * à `true` rallume tout — mais il faudra alors trancher ce que devient un
 * consentement donné en août pour un périmètre d'events qui aura peut-être changé.
 */
export const STATISTIQUES_USAGE_ACTIVES = false;
