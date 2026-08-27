// ── Rappel quotidien : l'heure choisie et ce qu'on dit ───────────────────────
//
// Module PUR — aucun import `react-native` ni `expo-notifications`, donc
// testable (cf. le préambule de `vitest.config.ts` : c'est précisément ce qui
// rendait `notifications.ts` intestable). `lib/notifications.ts` ne garde que
// la programmation système et vient chercher ici l'heure et le texte.
//
// Deux choses vivent là :
//
//  1. **L'heure est un nombre, plus un créneau.** Le rappel se réglait sur trois
//     valeurs en dur (8h00 · 12h00 · 18h30). Quelqu'un qui déjeune à 13h ou
//     dîne à 20h30 recevait donc un rappel à côté de sa vie. Ce qu'on stocke est
//     une heure libre, point.
//     *(Les trois créneaux ont survécu quelque temps comme RACCOURCIS en puces.
//     Elles sont retirées depuis le 2026-08-11 : deux champs et une rangée de
//     puces posaient la même question deux fois, et les puces gardaient trois
//     heures particulières au rang de proposition alors que le modèle ne les
//     distingue plus. Il n'en reste que `ANCIENS_CRENEAUX`, une migration de
//     lecture — voir le commentaire qui l'accompagne.)*
//
//  2. **Le message tourne.** Une notification qui répète la même phrase pendant
//     six mois devient un bruit qu'on balaie sans lire. Chaque créneau de la
//     journée a donc son jeu de messages, et l'index se calcule à partir du JOUR
//     où la notification tombera — aucun compteur à stocker, aucune part de
//     hasard, donc un test peut le vérifier.
//
// ⚠️ Le ton : encourager, jamais mettre la pression. Pas de « ne casse pas ta
// chaîne » ni de « tu as raté hier » — un rappel qui culpabilise fait fermer
// l'app, pas ouvrir le plan. Et pas d'émoji : la règle de CLAUDE.md §8 vaut ici
// comme ailleurs, une notification est de l'interface même si elle vit dans une
// chaîne de `lib/`.

/** Heure du jour à laquelle le rappel tombe, en heure LOCALE. */
export interface ReminderTime {
  hour: number;
  minute: number;
}

/** Titre + corps d'une notification. */
export interface ReminderCopy {
  title: string;
  body: string;
}

/** Heure posée quand on active le rappel sans rien préciser. */
export const DEFAULT_REMINDER_TIME: ReminderTime = { hour: 8, minute: 0 };

/** Ramène n'importe quelle paire dans un cadran valide (0–23 h, 0–59 min). */
export function clampReminderTime(hour: number, minute: number): ReminderTime {
  const h = Number.isFinite(hour) ? Math.min(23, Math.max(0, Math.trunc(hour))) : 0;
  const m = Number.isFinite(minute) ? Math.min(59, Math.max(0, Math.trunc(minute))) : 0;
  return { hour: h, minute: m };
}

/**
 * Ce que valaient les trois créneaux de l'ANCIEN modèle.
 *
 * 🔴 **CE N'EST PAS DU CODE MORT, ET CE N'EST PAS UNE TABLE DE RACCOURCIS** — les
 * deux malentendus qu'elle a déjà provoqués. C'est une **migration de lecture**,
 * relue à chaque démarrage, et elle ne pourra jamais être supprimée : la clé
 * `@kyroz:reminder` survit à la purge des données (cf. le `KEEP` du Profil) et
 * contient encore la chaîne `'morning'` chez tous ceux qui ont réglé leur rappel
 * avant l'heure libre (2026-08-07). Ils n'ont rien à faire pour que ça se
 * réécrive : personne ne repasse par le champ.
 *
 * ⚠️ Et ce que coûterait sa suppression **ne se verrait nulle part** : leur
 * rappel s'éteindrait sans un mot, et une notification qui n'arrive pas ne se
 * signale pas. Trois lignes contre une panne silencieuse — c'est réglé.
 *
 * *(Elle s'appelait `REMINDER_PRESETS` et était EXPORTÉE, avec son type et sa
 * liste d'ids. Le nom annonçait des raccourcis d'interface qui n'existent plus
 * depuis le retrait des puces : elle vit désormais dans le seul lecteur qu'elle
 * ait, sous le nom de ce qu'elle fait.)*
 */
const ANCIENS_CRENEAUX: Record<string, ReminderTime> = {
  morning: { hour: 8, minute: 0 },
  midday: { hour: 12, minute: 0 },
  evening: { hour: 18, minute: 30 },
};

/**
 * Lit la préférence stockée. `null` = aucun rappel. Reprend l'ancien format
 * (`'morning' | 'midday' | 'evening'`) — voir ci-dessus.
 */
export function parseReminder(raw: string | null | undefined): ReminderTime | null {
  if (!raw || raw === 'off') return null;
  const ancien = ANCIENS_CRENEAUX[raw];
  if (ancien) return { ...ancien };
  const m = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return { hour: h, minute: min };
}

/** Écrit la préférence. Toujours `'off'` ou `'HH:MM'` — jamais un créneau. */
export function serializeReminder(time: ReminderTime | null): string {
  if (!time) return 'off';
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

/** Affichage français : `8h00`, `18h30`. L'heure ne se pave pas, les minutes si. */
export function formatReminderTime(time: ReminderTime): string {
  return `${time.hour}h${String(time.minute).padStart(2, '0')}`;
}

// ── Le moment de la journée décide de ce qu'on dit ───────────────────────────
// Un rappel à 20h qui annonce « prépare ton petit-déjeuner » est pire que pas de
// rappel du tout. L'heure libre rendait ce risque réel : les trois créneaux
// garantissaient le contexte, plus maintenant. On le retrouve donc par calcul.
export type ReminderPeriod = 'matin' | 'midi' | 'apresmidi' | 'soir';

/**
 * Le créneau de journée d'une heure. La nuit (00h–04h59) est rattachée au SOIR :
 * quelqu'un qui règle son rappel à 1h du matin finit sa journée, il ne la
 * commence pas.
 */
export function periodOf(time: ReminderTime): ReminderPeriod {
  const h = time.hour;
  if (h >= 5 && h <= 10) return 'matin';
  if (h >= 11 && h <= 14) return 'midi';
  if (h >= 15 && h <= 17) return 'apresmidi';
  return 'soir';
}

// ── Le TITRE dit pourquoi on dérange, le CORPS motive ────────────────────────
//
// Découpage voulu : une notification qui ne porterait QUE la citation ne dirait
// plus ce qu'on attend de toi, et une qui ne porterait que la consigne finirait
// en bruit. Le titre reste donc ancré au moment de la journée (c'est lui qui
// remplace le contexte que les trois créneaux garantissaient), et le corps porte
// la citation.
//
// ⚠️ **Les deux compteurs doivent être PREMIERS ENTRE EUX**, sinon le couple
// tourne au rythme du plus petit dénominateur commun et non de leur produit.
// Mesuré : retirer UNE citation (16 → 15) avec 3 titres a fait tomber le cycle
// de 48 à 15 jours — un tiers de la variété perdu par une suppression qui n'avait
// rien à voir. 4 titres et **45 citations** sont premiers entre eux → **180 jours**.
// Le test « le couple ne se répète pas avant un mois » tient cette propriété :
// c'est lui qui a désigné la régression, pas une relecture.
//
// 🔴 **C'EST LA PARITÉ QUI COMPTE, PAS LA TAILLE.** 4 titres se divisent par 2 et
// par 4 : toute quantité PAIRE de citations écroule le cycle de moitié ou des
// trois quarts. Passer de 15 à 44 aurait rendu 44 jours au lieu de 180 — donc
// TROIS FOIS MOINS de variété en ajoutant vingt-neuf citations. Le nombre de
// citations doit rester **impair**, et c'est la seule contrainte qui ne se voit
// pas en lisant la liste.
export const REMINDER_TITLES: Record<ReminderPeriod, string[]> = {
  matin: ['Ta journée commence', 'Le plan du jour est prêt', 'On y va', 'Un coup d’œil et c’est parti'],
  midi: ['C’est l’heure de manger', 'Pause déjeuner', 'Ton déjeuner t’attend', 'Ton midi est déjà prévu'],
  apresmidi: ['Point de l’après-midi', 'Ton plan est toujours là', 'Il te reste la journée', 'Un point rapide'],
  soir: ['Le dîner approche', 'Dernier repas de la journée', 'On finit la journée', 'Ce soir, tout est prêt'],
};

/** Une citation. `auteur` absent = maxime maison, et ça se voit à l'écran. */
export interface Citation {
  texte: string;
  auteur?: string;
}

// ⚠️ **On n'attribue que ce qui tient.** Le registre « citation motivante » est
// le plus mal attribué qui soit : « Que ton aliment soit ta seule médecine »
// n'est pas d'Hippocrate (absente du corpus), et « l'excellence est une
// habitude » est de Will Durant résumant Aristote, pas d'Aristote. Ces deux-là
// sont précisément celles qu'une app de nutrition a envie de mettre — elles ne
// sont pas ici. Un auteur faux est un mensonge affiché, au même titre qu'un
// chiffre faux (cf. la règle « pas de mensonge » de CLAUDE.md).
//
// Ce qui porte un auteur ci-dessous est du domaine public : Sénèque (Lettres à
// Lucilius), Ovide (Pontiques, L'Art d'aimer), Marc Aurèle (Pensées), Épictète
// (Manuel), Lao Tseu (Tao Te King 33 et 64), Hésiode (Les Travaux et les Jours),
// Cicéron, Publilius Syrus (Sentences), Vauvenargues (Réflexions et maximes),
// Montaigne (Essais), La Rochefoucauld (Maximes). Le reste n'a PAS d'auteur —
// ce sont des maximes écrites pour Kyroz, et elles s'affichent sans signature
// plutôt que sous un nom emprunté.
//
// ⚠️ **Le critère de sélection des signatures ajoutées le 2026-08-11 : la formule
// doit être BRÈVE et archi-documentée.** Plus une citation est longue, plus elle
// dépend d'une traduction particulière — et une traduction récente n'est pas du
// domaine public, même quand l'auteur l'est depuis deux mille ans. Les formules
// retenues sont courtes, stables, et circulent sous cette forme depuis des
// siècles. ➡️ **Au moindre doute sur une attribution, elle devient une maxime
// SANS signature** — c'est gratuit, et ça ne fait mentir personne.
//
// ⚠️ Une citation d'auteur ne se RACCOURCIT pas pour tenir dans une bannière :
// la tronquer ferait dire à Sénèque ce qu'il n'a pas écrit. Une seule
// (« Ce n'est pas parce que les choses sont difficiles… », 141 caractères)
// dépassait le plafond de 140 — elle a été RETIRÉE, pas rognée, et le plafond
// n'a pas bougé d'un caractère pour l'accueillir.
// ⚠️ **L'ORDRE DU TABLEAU EST L'ORDRE DES JOURS** — il n'est pas décoratif, et
// c'est ce qui rend l'ajout d'un lot plus délicat qu'un copier-coller en fin de
// liste : vingt maximes ajoutées à la suite donneraient vingt jours sans une
// seule signature. Le lot du 2026-08-11 est donc ENTRELACÉ à la main, une signée
// toutes les deux ou trois citations.
// Historique du même piège : rangées par famille (les 6 signées, puis les 9
// maximes), elles donnaient trois
// philosophes d'affilée en ouverture puis neuf jours de maximes : « semaine
// antique, puis semaine Kyroz ». Ça ne se voit pas dans le fichier, ça se voit
// sur un aperçu de 14 jours. Elles sont donc ENTRELACÉES, et un test tient la
// propriété (jamais 3 de la même famille de suite, bouclage compris).
// ── Le plafond des TRADUCTIONS — le seul vrai risque juridique ───────────────
//
// Les ŒUVRES citées ici sont toutes dans le domaine public : le plus récent des
// auteurs est Vauvenargues, mort en 1747. Ce n'est pas la question.
//
// 🔴 **UNE TRADUCTION EST UNE ŒUVRE À PART, protégée 70 ans après la mort du
// TRADUCTEUR.** Marc Aurèle est libre ; une traduction parue en 1992 ne l'est pas.
// C'est le seul endroit où citer un ancien peut coincer, et il n'apparaît nulle
// part quand on lit la liste — les deux noms qui comptent, l'auteur et le
// traducteur, un seul est écrit.
//
// ➡️ Deux façons pour une citation d'être hors d'atteinte, et il en faut UNE :
//  1. **son auteur écrivait en français** (`AUTEURS_DE_LANGUE_FRANCAISE`) — il n'y
//     a alors pas de traducteur du tout ; moderniser une graphie ne crée aucun
//     droit nouveau ;
//  2. **elle est assez COURTE** pour qu'aucune empreinte personnelle de traducteur
//     n'y tienne. « L'habitude est une seconde nature » n'a pas dix rédactions
//     possibles : il n'y a rien d'original à protéger.
//
// ⚠️ **90 et non 60, et l'écart est un arbitrage, pas une approximation.** À 60, il
// aurait fallu remplacer quatre citations de plus — dont « la goutte d'eau creuse
// la pierre » (Ovide) et « il n'est pas de vent favorable pour qui ne sait où il
// va » (Sénèque), qui sont des PROVERBES français dont la forme circule bien avant
// toute traduction vivante. Les retirer n'achetait aucune sécurité : ça coûtait
// deux bonnes citations pour rien. Le risque réel est la rédaction LONGUE, littéraire
// et moderne — c'est elle que ce plafond arrête.
// ⚠️ Et il n'est pas décoratif : la plus longue traduite en service (Épictète, 84)
// passe à **6 caractères** du plafond. Un test fige cette marge, pour que sa
// dégradation se remarque.
//
// 🔴 **UNE CITATION NE SE RACCOURCIT PAS POUR PASSER SOUS LE PLAFOND** — c'est la
// règle écrite plus haut, et elle prime sur celle-ci. Une traduction trop longue se
// REMPLACE par une autre du même auteur, ou perd sa signature pour devenir une
// maxime maison. La tronquer ferait dire à Sénèque ce qu'il n'a pas écrit, ce qui
// est précisément le mensonge qu'on cherche à éviter.
//
// *(Appliqué le 2026-08-11 : « Tu as pouvoir sur ton esprit, non sur les événements
// extérieurs… » — 104 caractères — a été REMPLACÉE par un Marc Aurèle bref et
// littéral (Pensées VII, 59). Elle cumulait les deux défauts : la plus exposée côté
// traduction, et une forme qui circule surtout comme condensation moderne des
// Pensées plutôt que comme un passage qu'on y retrouve tel quel.)*

/** Ceux qui ont écrit EN FRANÇAIS — donc sans traducteur entre eux et l'écran. */
export const AUTEURS_DE_LANGUE_FRANCAISE = ['Montaigne', 'La Rochefoucauld', 'Vauvenargues'];

/** Longueur maximale d'une citation TRADUITE. Voir le raisonnement ci-dessus. */
export const TRADUCTION_MAX = 90;

// ── CHAQUE SIGNATURE PORTE SA SOURCE (constat 06b-17, 2026-08-27) ───────────
//
// 🔴 DEUX ATTRIBUTIONS SUR SEIZE ÉTAIENT FAUSSES, ET C'EST EN LES SOURÇANT QU'ON L'A VU.
// Le constat d'origine visait un autre risque — « `formatCitation` n'a pas de branche
// sans auteur » — et ce risque-là N'EXISTE PAS (`reminder.ts` a la branche depuis
// toujours). Restait le point qu'aucune mesure n'avait touché : les attributions
// elles-mêmes. Un auteur faux est un mensonge affiché, au même titre qu'un chiffre faux.
//
//  ① « La goutte d'eau creuse la pierre, **non par la force, mais en tombant souvent** »
//     n'est pas d'Ovide. `Gutta cavat lapidem` l'est (Pontiques IV, 10, 5) ; le
//     `non vi sed saepe cadendo` est un AJOUT MÉDIÉVAL de commentateurs. La phrase
//     entière prêtait donc à Ovide des mots qu'il n'a pas écrits.
//     ➡️ On lui rend ce qu'il a écrit : `Gutta cavat lapidem, consumitur anulus usu`.
//     ⚠️ **Retirer la signature aurait été plus simple et plus faux** : `auteur` absent
//     veut dire « maxime maison » (cf. le type), or ce proverbe n'est pas de nous. Et
//     ça aurait cassé l'alternance signées/maximes, qu'un test tient.
//
//  ② « La pratique est le meilleur des maîtres » n'est pas de Publilius Syrus.
//     `Usus magister est optimus` est de CICÉRON (Pro Rabirio Postumo IV, 9).
//
// ➡️ **Les seize portent désormais leur référence en fin de ligne.** Ce n'est pas de la
// décoration : une attribution qu'on ne peut pas aller vérifier se recopie de site en
// site, et c'est exactement ainsi que les deux fausses sont arrivées ici.
// ⚠️ Vérifié sur des sources externes, pas de mémoire — les deux corrections viennent de
// là. Les quatorze autres sont sourcées d'après le passage cité ; si l'une est prise en
// défaut, c'est la RÉFÉRENCE qui doit être corrigée, pas effacée.
export const CITATIONS: Citation[] = [
  { texte: 'Tu n’as pas besoin de motivation aujourd’hui. Tu as un plan.' },
  { texte: 'La goutte creuse la pierre, et l’anneau s’use à l’usage.', auteur: 'Ovide' },   // Pontiques IV, 10, 5
  { texte: 'La régularité bat l’intensité, tous les jours de la semaine.' },
  { texte: 'Ce n’est pas le repas parfait qui compte, c’est le suivant.' },
  { texte: 'Un voyage de mille lieues commence toujours par un premier pas.', auteur: 'Lao Tseu' },   // Tao Te King, ch. 64
  { texte: 'Les résultats viennent des jours ordinaires, pas des jours exceptionnels.' },
  { texte: 'Un plan suivi à 80 % vaut mieux qu’un plan parfait abandonné.' },
  { texte: 'Rien n’est plus fort que l’habitude.', auteur: 'Ovide' },   // L’Art d’aimer II, 345
  { texte: 'Ce que tu répètes devient facile. C’est tout le secret.' },
  { texte: 'Trois mois passent de toute façon. Autant qu’ils comptent.' },
  { texte: 'Regarde au-dedans : au-dedans est la source du bien.', auteur: 'Marc Aurèle' },   // Pensées VII, 59
  { texte: 'Manger comme prévu, c’est déjà une victoire de la journée.' },
  { texte: 'Personne ne se transforme en un jour. Tout le monde se transforme en un an.' },
  { texte: 'Il n’est pas de vent favorable pour qui ne sait où il va.', auteur: 'Sénèque' },   // Lettres à Lucilius 71, 3
  { texte: 'Une journée ordinaire bien suivie vaut mieux qu’une semaine héroïque.' },
  { texte: 'Le plan est déjà fait. Il ne te reste qu’à passer à table.' },
  { texte: 'Ajoute peu à peu sur peu, et bientôt cela fera beaucoup.', auteur: 'Hésiode' },   // Les Travaux et les Jours, 361-362
  { texte: 'Ce que tu fais souvent compte plus que ce que tu fais parfaitement.' },
  { texte: 'Il n’y a pas de journée décisive. Il y a des journées qui s’additionnent.' },
  { texte: 'Ce ne sont pas les choses qui troublent les hommes, mais les opinions qu’ils en ont.', auteur: 'Épictète' },   // Manuel, 5
  { texte: 'Reviens au plan quand tu veux. Il t’attend sans rien te demander.' },
  { texte: 'Le corps change lentement, puis d’un coup.' },
  { texte: 'L’habitude est une seconde nature.', auteur: 'Cicéron' },   // Des termes extrêmes V, 25, 74
  { texte: 'Un écart ne défait pas une semaine. Il en fait partie.' },
  { texte: 'Le plus dur est déjà derrière toi : décider quoi manger.' },
  { texte: 'Ce n’est pas que nous ayons peu de temps, c’est que nous en perdons beaucoup.', auteur: 'Sénèque' },   // De la brièveté de la vie I, 3
  { texte: 'Avance à ton rythme. Le moteur porte la charge, pas toi.' },
  { texte: 'Le progrès n’est pas spectaculaire. Il est régulier.' },
  { texte: 'La pratique est le meilleur des maîtres.', auteur: 'Cicéron' },   // Pro Rabirio Postumo IV, 9
  { texte: 'Ce qui est prévu se fait tout seul. Le reste se discute.' },
  { texte: 'Les bonnes journées se ressemblent. C’est ce qui les rend faciles.' },
  { texte: 'La patience est l’art d’espérer.', auteur: 'Vauvenargues' },   // Réflexions et maximes, 251
  { texte: 'Tu n’as rien à prouver aujourd’hui. Juste à manger ce qui est prévu.' },
  { texte: 'Ton assiette du jour est déjà calculée. Il reste à en profiter.' },
  { texte: 'Qui se vainc soi-même est fort.', auteur: 'Lao Tseu' },   // Tao Te King, ch. 33
  { texte: 'Prends ton temps. Rien dans ce plan ne se périme.' },
  { texte: 'La faim se prévoit. C’est tout l’intérêt d’avoir un plan.' },
  { texte: 'Tant que tu vis, apprends à vivre.', auteur: 'Sénèque' },   // Lettres à Lucilius 76, 3
  { texte: 'Chaque semaine ressemble à la précédente. C’est exactement le but.' },
  { texte: 'La discipline, c’est surtout de ne plus avoir à choisir.' },
  { texte: 'Ce qui fait obstacle à l’action fait avancer l’action.', auteur: 'Marc Aurèle' },   // Pensées V, 20
  { texte: 'Un plan qu’on suit sans y penser est un plan qui a gagné.' },
  { texte: 'La plus grande chose du monde, c’est de savoir être à soi.', auteur: 'Montaigne' },   // Essais I, 39
  { texte: 'Deux repas prévus valent mieux qu’une bonne résolution.' },
  { texte: 'La parfaite valeur est de faire sans témoins ce qu’on serait capable de faire devant tout le monde.', auteur: 'La Rochefoucauld' },   // Maximes, 216
];

/** Le corps affiché : la citation, suivie de son auteur s'il y en a un. */
export function formatCitation(c: Citation): string {
  return c.auteur ? `${c.texte} — ${c.auteur}` : c.texte;
}

// ── Une notification demande un GESTE : elle doit y conduire ──────────────────
//
// 🔴 Elle n'y conduisait pas. Le rappel de pesée dit « Note ton poids : trente
// secondes », et le toucher déposait l'utilisateur là où l'app était restée —
// l'onglet Recettes, la liste de courses, une feuille de réglages ouverte. Le
// dépôt ne portait AUCUN `addNotificationResponseReceivedListener` : la réponse
// au tap n'était lue nulle part.
//
// La contrainte de CLAUDE.md §4 (« friction décroissante ») ne parle pas d'autre
// chose : une notification qui réclame trente secondes ne peut pas commencer par
// faire chercher son écran.
//
// ⚠️ **Ce marqueur voyage dans la notification, donc il SURVIT aux mises à jour**
// — une notification programmée hier est lue par le code d'aujourd'hui. D'où un
// repli explicite plutôt qu'un `switch` exhaustif : une notification programmée
// AVANT ce chantier n'a aucune donnée, et elle doit rester ouvrable.

/** Ce que porte une notification pour qu'on sache où l'ouvrir. */
export type NotifKind = 'daily' | 'weigh';

/** Là où le tap doit conduire. */
export type NotificationIntent = 'plan' | 'weigh-in';

/**
 * L'écran que le tap doit ouvrir, lu sur la charge utile de la notification.
 *
 * ⚠️ Repli sur `'plan'` — jamais `null`. Un tap qui ne mène nulle part est le
 * défaut qu'on corrige ; une notification inconnue (programmée par une version
 * antérieure, ou par une version future installée puis rétrogradée) doit au pire
 * ouvrir le plan, qui est la destination utile des deux rappels existants.
 */
export function intentFromData(data: unknown): NotificationIntent {
  const kind = (data as { kind?: unknown } | null | undefined)?.kind;
  return kind === 'weigh' ? 'weigh-in' : 'plan';
}

export const WEIGH_IN_MESSAGES: ReminderCopy[] = [
  { title: 'Ta pesée du jour', body: 'Note ton poids : Kyroz réajuste tes calories et ton plan tout seul.' },
  { title: 'Un chiffre, rien de plus', body: 'La pesée sert à caler ton plan, pas à te juger.' },
  { title: 'C’est le jour de la pesée', body: 'Trente secondes, et ton plan reste aligné sur ta progression.' },
];

/**
 * Numéro du jour civil LOCAL d'une date (jours depuis l'époque). Sert d'index de
 * rotation : deux jours voisins donnent deux messages voisins, et le même jour
 * redonne le MÊME message — ré-armer le rappel trois fois dans la journée ne
 * doit pas faire défiler le jeu.
 */
export function dayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
}

/**
 * Prochaine occurrence de l'heure choisie, en local. Si l'heure du jour est déjà
 * passée, c'est demain — c'est cette date qui donne l'index du message, pour que
 * le texte corresponde au jour où il s'affichera et non au jour où on l'arme.
 */
export function nextReminderAt(time: ReminderTime, now: Date): Date {
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.hour, time.minute, 0, 0);
  if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
  return at;
}

// `%` garde le signe en JS : un index négatif (date antérieure à 1970, ou horloge
// fantaisiste) sortirait du tableau et rendrait `undefined`.
const rang = (index: number, taille: number) => ((index % taille) + taille) % taille;

/** La citation du jour `index`. Déterministe. */
export function pickCitation(index: number): Citation {
  return CITATIONS[rang(index, CITATIONS.length)];
}

/** Le message du jour `index` pour une heure donnée. Déterministe. */
export function pickReminderCopy(time: ReminderTime, index: number): ReminderCopy {
  const titres = REMINDER_TITLES[periodOf(time)];
  return {
    title: titres[rang(index, titres.length)],
    body: formatCitation(pickCitation(index)),
  };
}

/**
 * Idem pour la pesée — indexé sur le jour de l'échéance, pas de la
 * programmation. ⚠️ Pas de citation ici : la pesée demande un GESTE précis, et
 * une maxime à sa place laisserait l'utilisateur sans savoir quoi faire.
 */
export function pickWeighInCopy(index: number): ReminderCopy {
  return WEIGH_IN_MESSAGES[rang(index, WEIGH_IN_MESSAGES.length)];
}

// ── Le rappel quotidien est une SÉRIE DATÉE, plus un déclencheur répétitif ────
//
// 🔴 CE CHANGEMENT RENVERSE UN ARBITRAGE, et il faut savoir lequel (2026-08-12,
// décision fondateur, sur un signalement de testeur : « je reçois la même longue
// citation de Marc Aurèle tous les jours »).
//
// Avant : UN déclencheur `DAILY`, qui se rejoue tout seul indéfiniment. Son
// contenu est figé à la PROGRAMMATION — le système ne rappelle jamais l'app pour
// lui demander quoi écrire. Le texte ne tournait donc que pour qui OUVRE l'app,
// puisque seul le ré-armement au démarrage le renouvelle. Qui décroche recevait
// la même phrase, mot pour mot, pendant des semaines. C'est-à-dire exactement la
// personne que le rappel existe pour ramener.
//
// L'alternative avait été écartée en son temps au motif que « un rappel qui lâche
// vaut moins qu'un message qui se répète ». Le signalement tranche autrement : une
// notification identique tous les matins n'est pas un rappel, c'est du bruit — et
// le bruit se termine par les notifications coupées, ce qui est pire que
// l'extinction qu'on cherchait à éviter.
//
// ⚠️ CE QUE ÇA COÛTE, ET IL FAUT L'ASSUMER : la série a une FIN. Sans ouverture
// pendant `RAPPELS_A_L_AVANCE` jours, le rappel s'éteint pour de bon. Le
// ré-armement au démarrage (`loadReminder`, layout racine) la remet à niveau à
// chaque lancement, donc le compteur ne descend que chez quelqu'un de totalement
// silencieux.
//
// 🔴 LE NOMBRE VIENT D'UN BUDGET, PAS D'UNE INTUITION : **iOS ne garde que 64
// notifications en attente par app**, les plus lointaines sont jetées en silence.
// La pesée en réserve déjà jusqu'à 6 (`WEIGH_IN_AHEAD`). 30 laisse donc une marge
// large, couvre un mois complet de silence, et reste sous le plafond même si la
// pesée passait à une série plus longue. Monter à 60 tiendrait tout juste
// aujourd'hui et casserait au premier rappel ajouté — sans erreur, en perdant les
// dernières.
export const RAPPELS_A_L_AVANCE = 30;

/** Une notification datée de la série : quand elle tombe, et ce qu'elle dit. */
export interface RappelPrevu extends ReminderCopy { date: Date }

/**
 * La série des prochains rappels : `jours` notifications datées, une par jour, à
 * l'heure choisie, chacune portant DÉJÀ le texte de son jour.
 *
 * ⚠️ Chaque date est construite en heure LOCALE par `setDate(+1)`, jamais par un
 * ajout de 86 400 000 ms : au changement d'heure, l'ajout en millisecondes
 * décalerait le rappel d'une heure pour le reste de la série. On veut la même
 * heure au cadran, pas la même durée écoulée.
 */
export function serieQuotidienne(
  time: ReminderTime,
  now: Date = new Date(),
  jours: number = RAPPELS_A_L_AVANCE,
): RappelPrevu[] {
  const premiere = nextReminderAt(time, now);
  const out: RappelPrevu[] = [];
  for (let i = 0; i < Math.max(0, jours); i++) {
    const date = new Date(premiere);
    date.setDate(date.getDate() + i);
    // L'index est pris sur le jour où la notification TOMBE — c'est ce qui fait
    // que le texte du 3ᵉ jour est bien celui du 3ᵉ jour, et non trois fois celui
    // du jour où on a armé la série.
    out.push({ date, ...pickReminderCopy(time, dayIndex(date)) });
  }
  return out;
}
