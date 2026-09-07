import React from 'react';
import { useTheme, Radius, CIBLE_TACTILE_MIN } from '../constants/theme';

// ── Le bouton officiel Apple, pas un bouton maison ───────────────────────────
//
// Apple l'EXIGE (Human Interface Guidelines) : un bouton personnalisé doit
// suivre à la lettre son gabarit de marque (logo, texte, couleurs, proportions),
// et le composant natif est la seule façon de le garantir automatiquement — il
// est aussi localisé et accessible sans rien faire. `CLAUDE.md` §8 (« aucune
// couleur en dur », « la forme passe par un token ») ne s'applique PAS ici :
// c'est un contrôle SYSTÈME, au même titre qu'une alerte native ou la barre de
// statut, pas un composant de la DA de Kyroz.
//
// ⚠️ `require` en tête de fichier, PAS d'`import` statique : ce fichier n'existe
// que pour iOS/Android (`.web.tsx` le remplace sur le navigateur, cf. la même
// raison que `lib/purchases.web.ts`). `expo-apple-authentication` ne déclare
// AUCUNE plateforme web (`expo-module.config.json: "platforms": ["apple"]`) —
// un import statique ici serait sans risque de plantage, mais ce fichier n'est
// de toute façon jamais chargé côté web grâce à la résolution de plateforme.
// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const AppleAuth = require('expo-apple-authentication');

export function AppleSignInButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const t = useTheme();
  // ⚠️ `AppleAuthenticationButton` est un export NOMMÉ du module (pas `.default`) —
  // `index.js` fait `export { default as AppleAuthenticationButton } from
  // './AppleAuthenticationButton'`. Une erreur ici serait invisible à `tsc`
  // (le `require` est typé `any`) et ne se verrait qu'au premier rendu natif.
  const Bouton = AppleAuth?.AppleAuthenticationButton;
  if (!Bouton) return null;
  return (
    <Bouton
      buttonType={AppleAuth.AppleAuthenticationButtonType.CONTINUE}
      // Apple recommande le bouton CLAIR sur fond sombre, et l'inverse — jamais
      // un bouton qui se fond dans la page.
      buttonStyle={t.scheme === 'dark' ? AppleAuth.AppleAuthenticationButtonStyle.WHITE : AppleAuth.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={Radius.button}
      style={{ width: '100%', height: CIBLE_TACTILE_MIN + 6 }}
      onPress={disabled ? undefined : onPress}
    />
  );
}
