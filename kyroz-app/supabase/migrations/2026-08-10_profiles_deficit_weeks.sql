-- Kyroz — REGISTRE DES SEMAINES EN DÉFICIT (pause à la maintenance).
--
-- À JOUER À LA MAIN dans le dashboard Supabase (SQL Editor). Le schéma n'est pas
-- auto-appliqué, et une migration non jouée tue la synchro du profil EN SILENCE :
-- `lib/sync.ts` écrit par un `upsert` GLOBAL, donc une seule colonne absente fait
-- rejeter la ligne ENTIÈRE (400 / PGRST204). Ce n'est pas ce champ qu'on perd, c'est
-- tout le profil. Contrôle : `npm run check:migrations`.
--
-- POURQUOI CETTE COLONNE.
-- `ENGINE_REV` 7 a retiré les planchers dérivés de la masse maigre au-dessus de 30 %
-- de MG (H) / 40 % (F), et avec eux l'escalade RED-S — la seule chose qui forçait une
-- sortie de déficit. La pause à la maintenance prend le relais : après 8 semaines de
-- déficit d'affilée, la 9ᵉ est servie à la maintenance.
--
-- Elle comble aussi un trou plus ancien : `effectiveEaPerKgFfm` n'escaladait que pour
-- les femmes non ménopausées. Un HOMME n'a jamais eu, à aucune adiposité, le moindre
-- mécanisme le sortant d'une sèche — il pouvait creuser trois ans d'affilée. Le défaut
-- ne se voyait pas parce que le plancher le plafonnait à 0,3 kg/semaine.
--
-- POURQUOI PAS `low_ea_weeks`, qui a la même forme.
-- Prédicat différent, et incompatible : la zone basse est CUMULÉE sur 12 mois glissants
-- et non consécutive (une pause ne l'efface pas, sinon le garde-fou RED-S ne servirait
-- à rien). Le déficit se lit en série CONSÉCUTIVE — c'est la pause elle-même qui doit
-- remettre à zéro, c'est son objet. Et depuis ENGINE_REV 7 la zone basse ne se compte
-- plus du tout au-dessus du seuil d'adiposité : chez ceux qui ont le plus besoin d'une
-- pause, ce registre est vide par construction.
--
-- POURQUOI SYNCHRONISÉ et pas local-only (CLAUDE.md §3 conseille de commencer local).
-- C'est de l'état de MOTEUR, pas une préférence d'appareil : laissé en local, changer de
-- téléphone remettrait la série à zéro et rendrait jusqu'à 8 semaines de déficit
-- supplémentaires à quelqu'un que le moteur devait mettre en pause. `low_ea_weeks`, son
-- jumeau de forme et de rôle, est synchronisé pour exactement la même raison.
--
-- FORME. Même charge utile que `low_ea_weeks` : soit un tableau de stamps de lundis
-- (forme historique), soit `{ weeks: string[], since: string | null }`. `since` est ce
-- qui rend le compteur honnête — le plan servi reste en vigueur entre deux ouvertures
-- de l'app, donc les semaines écoulées comptent même sans recalcul. Cf. lib/safety.ts.
--
-- IDEMPOTENT : `IF NOT EXISTS`, rejouable sans risque.
-- NULL = aucun historique. Aucun backfill : personne n'a de série en cours avant la
-- livraison, et en inventer une déclencherait des pauses non méritées.

alter table public.profiles
  add column if not exists deficit_weeks jsonb;

comment on column public.profiles.deficit_weeks is
  'Registre des semaines passées EN DÉFICIT (série consécutive) — pilote la pause à la maintenance après 8 semaines. Forme partagée avec low_ea_weeks, prédicat différent. Cf. lib/safety.ts::consecutiveDeficitWeeksBefore.';
