-- Élargit la contrainte `body_fat_pct` de la table `profiles` : 3–60 → 3–65.
--
-- BUG VIVANT EN PRODUCTION, pas un durcissement préventif.
--
-- `lib/safety.ts::bodyFatBounds` borne le % de masse grasse PAR SEXE depuis le P0.4 :
-- 5–60 chez l'homme, 12–65 chez la femme (3 % était physiologiquement impossible chez
-- une femme, le gras essentiel tourne autour de 10–13 %). `components/BodyFatPicker.tsx`
-- lit ces bornes, donc une femme peut légitimement sélectionner 61 à 65 %.
--
-- La contrainte, elle, était restée à 60. Conséquence : l'upsert du profil est rejeté
-- par Postgres — et comme `profileToRow` écrit TOUTES les colonnes en un seul upsert,
-- ce n'est pas le seul champ %MG qui est perdu, c'est le PROFIL ENTIER. Le push échoue,
-- `pushProfile` renvoie false, le profil reste « dirty » et la synchro cloud est morte
-- en silence pour cette utilisatrice — exactement le mode de panne PGRST204 déjà
-- rencontré trois fois.
--
-- On ÉLARGIT (jamais on ne resserre) : une contrainte élargie n'a par construction
-- aucun effet sur les lignes existantes. À l'inverse, aligner la contrainte d'âge sur
-- MIN_AGE = 18 est volontairement laissé de côté : elle rejetterait les lignes des
-- comptes de 16-17 ans créés avant le relèvement, à leur prochaine écriture. Le blocage
-- des mineurs est appliqué côté client (onboarding + éditeur) ; la contrainte SQL n'est
-- qu'un filet de dernier recours, et un filet ne doit pas casser ce qu'il attrape.

alter table public.profiles
  drop constraint if exists profiles_body_fat_pct_check;

alter table public.profiles
  add constraint profiles_body_fat_pct_check
  check (body_fat_pct is null or (body_fat_pct >= 3 and body_fat_pct <= 65));

notify pgrst, 'reload schema';
