// ── Ré-authentification avant la suppression définitive ─────────────────────
//
// 🔴 UN TÉLÉPHONE DÉVERROUILLÉ SUFFISAIT À SUPPRIMER LE COMPTE (constat 01-06).
// `doDelete` demandait une confirmation, jamais une PREUVE. La session étant le seul
// facteur, quiconque a l'appareil en main quelques secondes pouvait détruire le compte
// et toutes les données de santé qui vont avec — irréversiblement, la cascade Supabase
// ne se rejoue pas.
//
// ⚠️ **CE QUI REND CE MODULE NÉCESSAIRE PLUTÔT QU'UN `if` DANS L'ÉCRAN** : tous les
// comptes n'ont PAS de mot de passe. L'accès de revue et les sessions invité passent par
// `signInAnonymously()` — aucun e-mail, aucun mot de passe. Leur demander une re-saisie
// leur fermerait la porte du droit à l'effacement, c'est-à-dire l'inverse exact du but.
// La décision « faut-il une preuve, et laquelle » est donc une RÈGLE, pas un détail
// d'affichage — et elle vit dans `lib/` parce que la suite de tests ne couvre que `lib/`.

/**
 * Cette session peut-elle prouver son identité par mot de passe ?
 *
 * ⚠️ Le prédicat porte sur l'**e-mail**, pas sur un drapeau `is_anonymous`. Deux raisons,
 * et la seconde est la vraie : un compte sans e-mail n'a par construction aucun mot de
 * passe à re-saisir — c'est ce qui décide, pas la façon dont la session a été ouverte ;
 * et `is_anonymous` est un champ que le fournisseur peut renommer, alors que « il y a une
 * adresse » est une propriété du compte.
 *
 * ⚠️ Une chaîne vide est traitée comme une absence : Supabase rend `email: ''` sur
 * certaines sessions anonymes, et `!!''` vaut déjà `false` — mais on le dit, parce qu'un
 * futur `?? ''` ailleurs rendrait la nuance invisible.
 */
export function peutProuverParMotDePasse(email: string | null | undefined): boolean {
  return typeof email === 'string' && email.trim().length > 0;
}

/**
 * Ce que la feuille de suppression doit demander avant d'agir.
 *
 * `'mot_de_passe'` → re-saisie exigée. `'confirmation_seule'` → le compte n'a pas de
 * mot de passe (session invité / accès de revue) : la double confirmation existante
 * reste le seul rempart, et **c'est assumé**. Exiger une preuve qu'ils ne peuvent pas
 * fournir reviendrait à supprimer leur droit à l'effacement.
 */
export type PreuveExigee = 'mot_de_passe' | 'confirmation_seule';

export function preuveExigee(email: string | null | undefined): PreuveExigee {
  return peutProuverParMotDePasse(email) ? 'mot_de_passe' : 'confirmation_seule';
}

/**
 * Le message à afficher quand la ré-authentification échoue.
 *
 * 🔴 **IL NE DIT JAMAIS SI L'ADRESSE EXISTE OU NON.** Le message d'erreur brut de
 * Supabase (`Invalid login credentials`) est déjà neutre, mais le recopier tel quel
 * livrerait de l'anglais technique à quelqu'un qui vient de taper son mot de passe. On
 * le remplace par une phrase française **également neutre** : elle ne distingue pas
 * « mauvais mot de passe » d'autre chose, donc cet écran ne peut pas servir à tester des
 * identifiants.
 *
 * ⚠️ Un échec RÉSEAU est distingué, lui, et c'est le contraire d'une fuite : dire « pas
 * de connexion » quand il n'y a pas de connexion évite de faire croire à quelqu'un que
 * son propre mot de passe est faux. C'est la même règle que partout ailleurs — la panne
 * qui se voit vaut mieux que la panne qui accuse l'utilisateur.
 */
export function messageEchecReauth(erreur: string | undefined, enLigne: boolean): string {
  if (!enLigne) return 'Pas de connexion : impossible de vérifier ton mot de passe pour l’instant.';
  if (erreur && /network|fetch|timeout/i.test(erreur)) {
    return 'La vérification n’a pas abouti. Vérifie ta connexion et réessaie.';
  }
  return 'Mot de passe incorrect.';
}
