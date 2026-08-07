import { useEffect, useState } from 'react';

/**
 * Compte à rebours en secondes — sert à interdire un renvoi d'e-mail trop tôt.
 *
 * ⚠️ Pourquoi un compte à rebours VISIBLE plutôt qu'un bouton qui échoue :
 * Supabase refuse un second envoi avant 60 s, avec une erreur technique
 * (« For security purposes, you can only request this after N seconds »).
 * Sans le rebours à l'écran, l'utilisateur appuie, lit une erreur, et conclut
 * que l'app est cassée — au moment précis où il attend un e-mail qui ne vient
 * pas. Le bouton grisé qui décompte dit la même chose sans accuser personne.
 *
 * Employé par les DEUX parcours à code (confirmation d'inscription et
 * réinitialisation de mot de passe) : le timer était écrit deux fois, il n'a
 * qu'un seul rôle.
 */
export function useCompteARebours(): [number, (secondes: number) => void] {
  const [restant, setRestant] = useState(0);

  useEffect(() => {
    if (restant <= 0) return;
    const id = setInterval(() => setRestant((n) => (n <= 1 ? 0 : n - 1)), 1000);
    return () => clearInterval(id);
  }, [restant]);

  return [restant, setRestant];
}
