# Brief — Étape 5 : Performance, accessibilité, robustesse

Mission : trouver ce qui casse l'usage réel — hors ligne, gros texte, lecteur d'écran, clavier français, appareil lent — et ce qui, dans un formulaire de santé, produit silencieusement une mauvaise valeur.

## Règles de session (priment sur les habitudes de CLAUDE.md pendant l'audit)

1. **Audit, pas fix.** Aucune modification, création ou suppression de fichier de code, de config ou de dépendance. Aucune installation dans le repo. Tu n'écris que les fichiers listés dans « Sortie ».
2. **Écriture au fil de l'eau.** Avant d'ouvrir le premier fichier du périmètre : crée le fichier de sortie depuis le squelette et remplis « Reste à couvrir » avec la liste complète issue du cadrage. Après chaque fichier ou section traité : écris les constats, coche la ligne. Rien ne reste en mémoire « pour la fin ».
3. **Périmètre borné.** Tu ne lis que ce qui est dans « Périmètre ». Un fichier hors périmètre nécessaire à un constat va dans « Hors périmètre », sans l'ouvrir. Jamais `node_modules`.
4. **Preuve obligatoire.** Chaque constat cite `fichier:ligne` ou `commande → sortie`. Sans preuve, pas de constat. Si tu ne peux pas conclure, écris ce qui bloque.
5. **Pas de vérification fictive.** Ce qui ne peut pas être lu ou exécuté depuis le repo va dans « Checklist humaine », avec la procédure exacte. Rien n'est présenté comme vérifié s'il ne l'a pas été.
6. **Une sévérité par constat.** P0 : bloque la soumission, expose légalement, ou produit un plan faux ou dangereux · P1 : avant lancement public · P2 : post-lancement · P3 : dette. En cas de doute : niveau supérieur si santé utilisateur, données ou légal ; inférieur sinon ; dis pourquoi.
7. **Fin de session.** Mets à jour « Reste à couvrir », puis `git add docs/audit-v1 && git commit -m "audit: étape 05 perf a11y robustesse"` — ajoute `(partiel)` au message si « Reste à couvrir » n'est pas vide. Rien d'autre n'est commité.
8. **Chat minimal.** Tout est dans le fichier. Le chat ne contient qu'une ligne finale : `Étape 05 — P0: n · P1: n · P2: n · P3: n · reste à couvrir: n`.

## Contexte produit

- Zéro charge mentale : un état d'erreur ou un écran vide non expliqué est un constat, pas un détail.
- Public francophone : séparateur décimal virgule, formats de nombres et de dates FR.
- Moteur local : le plan se calcule hors ligne ; seule la synchronisation dépend du réseau.

## Cadrage

```bash
git rev-parse --short HEAD
git ls-files | grep -E '^app/.*\.tsx$'            # expo-router : l'arbre = l'ordre des écrans
git ls-files | grep -E '^(components|screens|hooks)/.*\.tsx?$'
git ls-files | grep -Ei 'theme|colors|tokens|typography'
git ls-files | xargs grep -IlE 'NetInfo|isConnected|onLine'
git ls-files | xargs grep -IlE 'FlatList|FlashList|ScrollView|SectionList'
git ls-files | xargs grep -IlE 'parseFloat|parseInt|Number\('
```

« Reste à couvrir » = un écran par ligne dans l'ordre de l'arbre `app/`, puis les composants partagés, puis le thème, puis les sections transversales (C, F, I).

## Grille de contrôle (par écran, puis transversal)

### A. Saisie numérique — en premier, c'est le plus grave

Pour chaque champ numérique (poids, taille, MG, âge, objectif, durée) : `keyboardType` (`decimal-pad` ?) ; parsing : `parseFloat("72,5")` vaut `72` en JS. Toute conversion sans remplacement de la virgule = **P0** (plan faux, silencieux). Bornes de validation (poids, taille, MG, âge : min / max et message) ; que devient une saisie vide ou `0` ; débounce si le moteur recalcule à chaque frappe.

### B. Accessibilité

- Pressables sans texte : `accessibilityLabel` ; `accessibilityRole` sur boutons, liens, en-têtes ; `accessibilityState` (selected, disabled, checked).
- Cibles tactiles ≥ 44 pt (iOS) / 48 dp (Android) : mesure dimensions et `hitSlop` des petits boutons (icônes, stepper +/-).
- Dynamic Type : `git ls-files | xargs grep -InE 'allowFontScaling=\{false\}|maxFontSizeMultiplier'` — désactivé globalement = **P1** ; conteneurs à hauteur fixe contenant du texte (troncature à grande taille) ; `numberOfLines` sur des textes essentiels — un avertissement de sécurité tronqué = **P1**.
- Contraste : depuis le fichier de thème, calcule le ratio de chaque paire texte / fond utilisée (tableau B) ; < 4,5:1 texte normal, < 3:1 grand texte = **P1**.
- La couleur seule porte-t-elle un sens (déficit / surplus, atteint / non atteint) ? Icône ou texte en complément ? Couleur seule = **P2**.
- Images décoratives : `accessible={false}` / `importantForAccessibility="no"` / `accessibilityElementsHidden`.
- Composants custom (slider, picker, roue) : pilotables au lecteur d'écran ? Sinon **P1**.
- `AccessibilityInfo.isReduceMotionEnabled` respecté si animations.

### C. Réseau et hors ligne

- Détection hors ligne ? Que voit l'utilisateur quand Supabase ne répond pas : spinner infini = **P1**, erreur muette = **P1**, message honnête + action = OK.
- Timeout : `fetch` RN n'a pas de timeout applicatif par défaut ; `AbortController` ou équivalent sur les appels Supabase ?
- Écritures pendant une coupure : perdues, mises en file, ou bloquantes ? Un plan généré hors ligne est-il conservé ?
- Multi-appareils : dernier écrit gagne ? Note le comportement ; sévérité seulement si perte de données silencieuse = **P1**.

### D. États d'erreur et vides

- `catch` silencieux : `git ls-files | xargs grep -InE 'catch\s*(\([^)]*\))?\s*\{\s*\}'` — compte, liste ; dans un chemin utilisateur = **P1**.
- Error boundary global (expo-router `ErrorBoundary` ou équivalent) ? Absente = **P1** (écran blanc = désinstallation).
- Chaque écran a-t-il un état vide explicite (premier lancement, pas de plan, pas d'historique) et un état de chargement ?
- Messages d'erreur : ni stack technique, ni « Une erreur est survenue » sans action possible.

### E. Formulaires et clavier

`KeyboardAvoidingView` / insets clavier sur chaque formulaire ; `returnKeyType` et passage au champ suivant ; `autoComplete` / `textContentType` sur e-mail et mot de passe ; validation inline ; saisie conservée si l'app passe en arrière-plan pendant l'onboarding.

### F. Thème et modes

`useColorScheme` vs valeur `userInterfaceStyle` de la config (étape 3) : cohérents ? Couleurs codées en dur hors thème : `git ls-files | grep -E '\.tsx$' | xargs grep -InE '#[0-9a-fA-F]{3,8}\b|["'"'"'](white|black)["'"'"']'` hors fichiers thème — compte (**P3** ; **P2** si ça casse un mode sombre supporté).

### G. Tailles d'écran

Largeurs fixes, `Dimensions.get` figé au chargement, absence de `maxWidth` de contenu ; tablette (si `supportsTablet`), petit iPhone (SE), grand Android ; `orientation`.

### H. Safe areas et edge-to-edge

`SafeAreaView` ou `useSafeAreaInsets` sur chaque écran ; boutons du bas sous la barre système Android 15 edge-to-edge = **P1**.

### I. Performance

- Listes longues (aliments, historique) : `FlatList` / `FlashList` avec `keyExtractor` stable ; `ScrollView` + `map` sur > 50 items = **P2**.
- Recherche CIQUAL : où sont les données (JSON dans le bundle ? SQLite ?), chargées quand (démarrage ou à la demande), recherche débouncée, indexée ? Chargement synchrone d'un gros JSON au démarrage = **P1**.
- Appels moteur : fréquence (par frappe ? par écran ?), mémoïsés ?
- Contexte global unique → re-rendu de tout l'arbre à chaque changement = **P2**.
- Images : `expo-image`, tailles adaptées.
- Animations : Reanimated (UI thread) ou `Animated` JS ; `console.*` dans des chemins de rendu.
- Effets sans nettoyage (`useEffect` sans `return` sur listeners, timers, channels Supabase realtime) = **P2**.

### J. Localisation numérique et dates

Affichage des kcal / g / kg avec séparateurs FR (`toLocaleString('fr-FR')` ou lib) ; dates en FR ; pluriels. La typographie des textes est traitée en étape 6, ici seulement les nombres et dates.

### K. Navigation et reprise

Bouton retour matériel Android dans l'onboarding et sur le paywall ; app tuée en cours d'onboarding : reprise au bon endroit ? ; écrans légaux accessibles depuis les réglages.

### L. Notifications (si présentes)

Permission demandée au bon moment (jamais au lancement) ; contenu des notifications sans donnée de santé (visible sur écran verrouillé) = sinon **P1**.

## Checklist humaine

- [ ] Parcours complet VoiceOver (iOS) et TalkBack (Android).
- [ ] Dynamic Type au maximum + gras : chaque écran.
- [ ] Mode avion en plein onboarding, puis retour réseau.
- [ ] Android bas de gamme : cold start chronométré (> 3 s = P1), recherche aliment.
- [ ] iPad (si `supportsTablet`) et iPhone SE.
- [ ] Clavier iOS / Android en français : saisir « 72,5 » dans chaque champ numérique.

## Sortie : `docs/audit-v1/05-perf-a11y.md`

```markdown
# Audit V1 — Étape 5 : Performance, accessibilité, robustesse
Date : … · Commit audité : … · Périmètre : …

## Reste à couvrir
- [ ] …

## Écran × critères
| Écran | A saisie | B a11y | C réseau | D erreurs/vides | E clavier | G tailles | H safe area | K reprise | Constats |
(✔ / ✘ / – par cellule)

## B. Contrastes du thème
| Rôle | Texte | Fond | Ratio | Seuil | OK ? |

## Constats
### 05-01 <titre>
- Sévérité · Preuve · Risque · Reco · Effort (S/M/L)

## Checklist humaine
## Hors périmètre / non couvert
```

## Reprise

Session coupée : lis la sortie existante, repars de la première ligne non cochée de « Reste à couvrir », ne relis pas les fichiers cochés.
