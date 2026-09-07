import React from 'react';
import { Presse } from './Presse';
import { RESSORT, ressortRN, ressortReduit } from '../lib/motion';
import { useReduceMotion } from '../lib/reduceMotion';
import {
  Animated, View, Text, TextInput, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, ActivityIndicator, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing, Type, cardShadow, CIBLE_TACTILE_MIN, Trait, Icone, OPACITE_PRESSION } from '../constants/theme';

// ── Primitives UI thémées, réutilisables partout ─────────────────────────────

export function Card({ t, style, children }: { t: ThemePalette; style?: ViewStyle; children: React.ReactNode }) {
  return (
    <View style={[{ backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.xl }, cardShadow(t), style]}>
      {children}
    </View>
  );
}

/**
 * `disabled` = inerte (grisé ET non cliquable).
 * `muted` = « il manque quelque chose », mais le bouton RESTE cliquable : c'est
 * lui qui explique ce qui bloque. Sans ce troisième état, l'onboarding affichait
 * un bouton « Continuer » plein et franc qui refusait d'avancer — le seul retour
 * arrivait APRÈS le clic. Un bouton qui a l'air actif et ne l'est pas est un
 * mensonge d'interface ; le griser pour de bon en serait un autre, puisqu'on
 * perdrait l'explication.
 */
export function PrimaryButton({
  t, label, onPress, disabled, loading, muted,
}: { t: ThemePalette; label: string; onPress: () => void; disabled?: boolean; loading?: boolean; muted?: boolean }) {
  return (
    <Presse
      activeOpacity={OPACITE_PRESSION}
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: t.accent,
        borderRadius: Radius.button,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : muted ? 0.45 : 1,
      }}
    >
      {loading
        ? <ActivityIndicator color={t.onAccent} />
        : <Text style={{ ...Type.h3, color: t.onAccent }}>{label}</Text>}
    </Presse>
  );
}

export function Chip({
  t, label, selected, onPress,
}: { t: ThemePalette; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Presse
      activeOpacity={OPACITE_PRESSION}
      onPress={onPress}
      style={{
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        minHeight: CIBLE_TACTILE_MIN,
        justifyContent: 'center',
        borderRadius: Radius.pill,
        backgroundColor: selected ? t.accent : t.fill,
      }}
    >
      {/* Pas de bordure sur les pilules inactives : le remplissage suffit à les
          poser, et le liseré doublait le contour à chaque puce (cf. les filtres
          de l'écran Recettes). */}
      <Text style={{ ...(selected ? Type.bodyStrong : Type.body), color: selected ? t.onAccent : t.text }}>
        {label}
      </Text>
    </Presse>
  );
}

export function OptionCard({
  t, title, subtitle, selected, onPress,
}: { t: ThemePalette; title: string; subtitle?: string; selected: boolean; onPress: () => void }) {
  return (
    <Presse
      activeOpacity={OPACITE_PRESSION}
      onPress={onPress}
      style={[
        {
          backgroundColor: t.card,
          borderRadius: Radius.card,
          padding: Spacing.xl,
          borderWidth: Trait.controle,
          borderColor: selected ? t.accent : (t.scheme === 'dark' ? t.line : 'transparent'),
          flexDirection: 'row',
          alignItems: 'center',
        },
        t.scheme === 'light' && cardShadow(t),
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...Type.h3, color: t.text, letterSpacing: -0.3 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ ...Type.caption, color: t.textSecondary, marginTop: Spacing.xs }}>{subtitle}</Text>
        ) : null}
      </View>
      <View style={{
        width: 24, height: 24, borderRadius: 12,
        borderWidth: Trait.controle, borderColor: selected ? t.accent : t.lineStrong,
        backgroundColor: selected ? t.accent : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
      </View>
    </Presse>
  );
}

/**
 * 🔴 **UN CHAMP DE MOT DE PASSE SE RÉVÈLE — ET LE BOUTON VIT ICI, PAS CHEZ
 * L'APPELANT** (2026-09-04). Les trois champs masqués de l'app n'offraient
 * AUCUN moyen de relire ce qu'on venait de taper : `secureTextEntry` nu, sur
 * l'inscription, la connexion et la réinitialisation. C'est la friction la plus
 * chère de l'app — elle tombe sur l'écran où l'on perd le plus de monde, et le
 * seul recours d'une faute de frappe y est de tout reprendre à l'aveugle.
 *
 * ⚠️ **Le bouton appartient au CHAMP, pas à ses appelants.** Le poser dans
 * `login.tsx` puis dans `MotDePasseOublie.tsx` aurait fait deux copies d'un même
 * rôle — le défaut déjà payé par `Disclaimer` et `SectionLabel` (§8), et celui
 * que le champ de `profil.tsx` commentait lui-même (« le recopier à la main
 * était déjà l'erreur : un style sans nom dérive »). Ici, l'appelant écrit
 * `secureTextEntry` et n'a rien d'autre à savoir.
 *
 * ⚠️ **`revele` est LOCAL et repart masqué à chaque montage.** Un mot de passe
 * révélé qui survivrait à la fermeture de l'écran serait un réglage que personne
 * n'a demandé, sur la donnée la plus sensible du parcours.
 */
export function Field({
  t, label, suffix, secureTextEntry, ...props
}: { t: ThemePalette; label?: string; suffix?: string } & TextInputProps) {
  const [revele, setRevele] = React.useState(false);
  // Le bouton n'existe que pour un champ RÉELLEMENT masqué : `secureTextEntry`
  // absent (un e-mail, un poids) ne doit pas se voir offrir un œil qui ne
  // masquerait rien.
  const masquable = secureTextEntry === true;

  return (
    <View style={{ gap: Spacing.sm }}>
      {label ? <Text style={{ ...Type.captionStrong, color: t.textSecondary }}>{label}</Text> : null}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: t.scheme === 'dark' ? t.fill : t.card,
        borderRadius: Radius.button, borderWidth: Trait.fin, borderColor: t.line,
        paddingLeft: Spacing.lg,
        // Le bouton fait sa propre marge : il mesure `CIBLE_TACTILE_MIN` de large
        // et centre son icône, donc ajouter le retrait du cadre l'éloignerait du
        // bord de deux marges empilées.
        paddingRight: masquable ? 0 : Spacing.lg,
      }}>
        <TextInput
          placeholderTextColor={t.textTertiary}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          // ⚠️ `secureTextEntry` est PILOTÉ, pas transmis : c'est lui que le bouton
          // bascule. Le laisser dans `props` le figerait à la valeur de l'appelant
          // et rendrait l'œil décoratif — un contrôle qui ne pilote rien (§11).
          secureTextEntry={masquable && !revele}
          // minWidth: 0 → indispensable pour que l'input en flex:1 puisse RÉTRÉCIR
          // dans le cadre (sinon, surtout sur web, sa largeur intrinsèque pousse
          // l'unité hors de la bordure). Avec un suffixe, valeur alignée à droite
          // → collée à l'unité (« 30 min ») ; sans suffixe (ex. « Nom »), à gauche.
          style={{ ...Type.h3, flex: 1, minWidth: 0, paddingVertical: Spacing.lg, color: t.text, textAlign: suffix ? 'right' : 'left' }}
          {...props}
        />
        {suffix ? <Text style={{ ...Type.body, color: t.textTertiary, marginLeft: Spacing.sm }}>{suffix}</Text> : null}
        {masquable ? (
          <Presse
            onPress={() => setRevele((v) => !v)}
            activeOpacity={OPACITE_PRESSION}
            // Le libellé annonce ce que l'appui VA faire, jamais l'état courant :
            // VoiceOver lit déjà l'état par `accessibilityState.selected`.
            accessibilityLabel={revele ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            accessibilityState={{ selected: revele }}
            style={{ width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={revele ? 'eye-off-outline' : 'eye-outline'} size={Icone.standard} color={t.textTertiary} />
          </Presse>
        ) : null}
      </View>
    </View>
  );
}

/** Le retrait du curseur dans son rail — et donc l'écart entre les deux rayons. */
const RETRAIT_CURSEUR = 4;

/**
 * 🔴 **LE CURSEUR GLISSE, IL NE TÉLÉPORTE PAS** (2026-08-15). Le fond en accent
 * sautait d'une option à l'autre, sur **17 sélecteurs** — le contrôle le plus
 * répandu de l'app après le bouton. C'est le geste d'iOS depuis toujours, et il
 * ne relève pas du décor : le curseur qui voyage dit que les options sont les
 * cases d'un MÊME rail, là où un fond qui s'allume ailleurs les fait lire comme
 * deux boutons indépendants.
 *
 * 🔴 **ET LA COULEUR DU TEXTE VOYAGE AVEC LUI.** C'est le piège de ce chantier,
 * et il ne se voit qu'en le construisant : garder la bascule instantanée
 * (`on ? onAccent : textSecondary`) donnerait, pendant tout le trajet, un
 * libellé en couleur-sur-accent posé sur un rail sombre — donc **illisible
 * pendant 300 ms**, exactement sur l'élément qu'on vient de choisir. Une seule
 * valeur animée pilote donc les deux : la position du curseur ET la teinte de
 * chaque libellé, qui s'interpole sur sa distance à lui.
 *
 * ⚠️ `useNativeDriver: false` est obligatoire — une couleur ne s'interpole pas
 * sur le fil natif. Le coût est nul ici : un sélecteur ne bouge qu'au tap.
 * ⚠️ La première position se POSE (pas d'animation au montage) : un curseur qui
 * viendrait de la gauche à chaque affichage d'écran serait une animation
 * d'entrée déguisée, et la retenue est ce que la DA demande.
 */
export function Segmented<T extends string | number>({
  t, options, value, onChange,
}: { t: ThemePalette; options: { label: string; value: T }[]; value: T | null; onChange: (v: T) => void }) {
  const reduire = useReduceMotion();
  const [larg, setLarg] = React.useState(0);
  // 🔴 `value === null` = RIEN N'EST CHOISI, ET ÇA SE VOIT : pas de curseur, aucun
  // libellé à l'accent. Sans cet état, un segmenté MENT — il désigne toujours une
  // option, donc un défaut auquel personne n'a touché a l'exacte apparence d'une
  // réponse donnée. C'est le défaut que `neatOnboarding.test.ts` a fermé pour le NEAT
  // le 2026-08-19 ; le sexe l'a gardé jusqu'au 2026-09-01, et lui produisait un plan
  // faux plutôt qu'un cran prudent (cf. `sexeOnboarding.test.ts`).
  const vide = value === null;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const position = React.useRef(new Animated.Value(index)).current;
  const pose = React.useRef(false);
  const etaitVide = React.useRef(vide);

  // Chaque option occupe une part égale du rail, moins les gouttières.
  const utile = Math.max(0, larg - Spacing.xs * 2 - Spacing.xs * (options.length - 1));
  const pas = options.length > 0 ? utile / options.length : 0;

  // ⚠️ `useLayoutEffect` ET PAS `useEffect`. Au premier choix, `glissant` passe à vrai
  // dans le rendu, mais `position` vaut encore 0 : un effet PASSIF laisserait peindre
  // une frame où le curseur apparaît sur l'option 0 avant de sauter à la bonne — un
  // éclair de « Homme » sélectionné pour qui vient de toucher « Femme ».
  React.useLayoutEffect(() => {
    // Première pose, ou sortie de l'état vide : on POSE le curseur, on ne l'y fait pas
    // glisser. Il ne vient pas d'une option précédente — il n'y en avait aucune.
    if (!pose.current || etaitVide.current) {
      pose.current = true; etaitVide.current = vide; position.setValue(index); return;
    }
    etaitVide.current = vide;
    Animated.spring(position, {
      toValue: index,
      useNativeDriver: false,
      ...ressortRN(ressortReduit(RESSORT.pose, reduire)),
    }).start();
  }, [index, vide, reduire, position]);

  // Une seule option : rien à départager, donc rien à faire glisser. Rien de choisi :
  // rien à désigner — et `on` reste faux partout, donc tous les libellés restent
  // secondaires sans autre changement plus bas.
  const glissant = options.length > 1 && larg > 0 && !vide;

  return (
    <View
      onLayout={(e) => setLarg(e.nativeEvent.layout.width)}
      style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: Radius.button, padding: Spacing.xs, gap: Spacing.xs }}
    >
      {/* Rayon INTÉRIEUR = extérieur − le retrait (4) : c'est ce qui rend les deux
          courbes concentriques. Il était écrit 11 pour un cadre à 14, donc le
          curseur ne suivait pas tout à fait la courbe de son rail. */}
      {glissant && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: Spacing.xs, bottom: Spacing.xs, left: Spacing.xs,
            width: pas,
            borderRadius: Radius.button - RETRAIT_CURSEUR,
            backgroundColor: t.accent,
            transform: [{
              translateX: position.interpolate({
                inputRange: options.map((_, i) => i),
                outputRange: options.map((_, i) => i * (pas + Spacing.xs)),
              }),
            }],
          }}
        />
      )}
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Presse key={String(o.value)} onPress={() => onChange(o.value)} activeOpacity={OPACITE_PRESSION}
            style={{ flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.button - RETRAIT_CURSEUR, alignItems: 'center' }}>
            <Animated.Text
              style={{
                ...Type.bodySmallStrong,
                color: glissant
                  ? position.interpolate({
                      // L'option i est à l'accent quand le curseur est SUR elle,
                      // et redevient secondaire dès qu'il s'en éloigne d'un cran.
                      inputRange: [i - 1, i, i + 1],
                      outputRange: [t.textSecondary, t.onAccent, t.textSecondary],
                      extrapolate: 'clamp',
                    })
                  : (on ? t.onAccent : t.textSecondary),
              }}
            >
              {o.label}
            </Animated.Text>
          </Presse>
        );
      })}
    </View>
  );
}

/**
 * Étiquette de bloc, en petites capitales.
 *
 * `sub` — une ligne de sous-titre en casse normale, sous l'étiquette. Elle existe
 * pour une raison précise : sur le Profil, un nom de bloc (« TOI ») dit de QUOI il
 * parle, jamais ce qu'il PILOTE. « ce qui calcule ta dépense » rend le moteur
 * lisible sans le nommer, et donne une adresse mentale aux réglages qu'on ne
 * viendrait pas chercher — le NEAT en tête. Le sous-titre n'est PAS en capitales :
 * ce n'est pas une seconde étiquette, c'est une phrase.
 */
export function SectionLabel({ t, sub, children }: { t: ThemePalette; sub?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: Spacing.xs }}>
      <Text style={{
        ...Type.overline, color: t.textTertiary, textTransform: 'uppercase',
      }}>
        {children}
      </Text>
      {!!sub && (
        <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 17 }}>{sub}</Text>
      )}
    </View>
  );
}

/** Titre de section, en casse normale. Distinct de `SectionLabel` (petites
 *  capitales) : celui-ci découpe l'écran, l'autre étiquette un bloc. */
export function SectionTitle({ t, children }: { t: ThemePalette; children: React.ReactNode }) {
  return (
    <Text style={{ ...Type.h2, color: t.text, letterSpacing: -0.4, marginTop: Spacing.sm }}>
      {children}
    </Text>
  );
}

// Pas d'icône en tête de ligne : à 17 px semi-gras le libellé se lit seul, et dix
// pictogrammes empilés faisaient un mur de gris qui n'aidait personne à trouver
// « Objectif daté ». Le chevron reste — lui dit qu'il se passe quelque chose au
// toucher.
//
// ⚠️ MONTÉ ICI DEPUIS `profil.tsx` LE 2026-08-10, en sortant le Profil du
// fourre-tout : la moitié de ses lignes est partie dans `ReglagesSheet`, et deux
// fichiers avaient besoin du même composant. Le recopier aurait été « un style
// recopié partout est un rôle qui n'a pas de nom » (CLAUDE.md §8), sur le
// composant le plus employé de l'app.
// ⚠️ `tourId` RETIRÉ le 2026-08-25 : il rendait une ligne de menu ciblable par la
// visite guidée, et plus aucune bulle ne vise d'objet depuis la seconde coupe des
// tutos. La prop n'avait déjà plus d'appelant — c'est le garde-fou de dormance de
// `visiteGuidee.test.ts` qui l'a trouvée, pas une relecture.
export function MenuRow({
  t, label, value, onPress, last, readonly,
}: { t: ThemePalette; label: string; value: string; onPress: () => void; last?: boolean; readonly?: boolean }) {
  return (
    <Presse onPress={onPress} activeOpacity={readonly ? 1 : OPACITE_PRESSION} disabled={readonly}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg }, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...Type.h3, color: t.text, letterSpacing: -0.3 }}>{label}</Text>
        <Text style={{ ...Type.bodySmall, color: t.textTertiary, marginTop: Spacing.xs }} numberOfLines={1}>{value}</Text>
      </View>
      {!readonly && <Ionicons name="chevron-forward" size={Icone.standard} color={t.textTertiary} />}
    </Presse>
  );
}

// ── Le bouton qui dévoile la suite d'une liste ──────────────────────────────
//
// Trois listes s'en servent — les réalisables et les presque-réalisables de la liste
// « Réalisable », et
// le catalogue des 512. Trois copies auraient divergé au premier ajustement, sur
// la seule chose qu'un tel bouton doit faire : DIRE COMBIEN il en reste.
//
// ⚠️ Le libellé et l'arithmétique ne vivent PAS ici mais dans `lib/revelation.ts`,
// qui est pur et testé. Ce composant ne fait que le rendre — même découpage que la
// visite guidée (le contenu dans `tours.ts`, le moteur dans `GuidedTour.tsx`).
export function BoutonRevelation({
  t, libelle, onPress,
}: { t: ThemePalette; libelle: string; onPress: () => void }) {
  if (!libelle) return null;
  return (
    <Presse
      onPress={onPress}
      activeOpacity={OPACITE_PRESSION}
      accessibilityRole="button"
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
        minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button,
        backgroundColor: t.fill, marginTop: Spacing.md,
      }}
    >
      <Text style={{ ...Type.bodySmallStrong, color: t.text }}>{libelle}</Text>
      <Ionicons name="chevron-down" size={Icone.petite} color={t.textSecondary} />
    </Presse>
  );
}

/**
 * Ce qu'il faut à une liste déroulante pour qu'une saisie reste VISIBLE quand le
 * clavier monte. À spreader sur TOUT `ScrollView` qui contient un champ.
 *
 * 🔴 **Signalé par le fondateur le 2026-08-25**, sur le %MG de Profil →
 * Informations : « ça ne remonte pas la page donc je vois pas ce que j'écris ». Le
 * champ est bas dans la feuille, sous une grille de six silhouettes ; le clavier le
 * recouvrait et RIEN ne décalait le contenu. `EditorShell` — l'enveloppe des SIX
 * éditeurs du Profil — n'avait aucune des deux propriétés ci-dessous.
 *
 * · `automaticallyAdjustKeyboardInsets` (iOS) ajoute au bas du contenu la hauteur
 *   du clavier. C'est ce qui permet à iOS d'amener le champ focalisé à l'écran ;
 *   sans marge en bas, il n'y a littéralement nulle part où défiler. Android
 *   l'ignore — il redimensionne déjà la fenêtre.
 * · `keyboardShouldPersistTaps: 'handled'` — sans lui, clavier ouvert, le premier
 *   tap sur une puce ou sur « Enregistrer » ne fait QUE refermer le clavier et se
 *   perd. `WeightCheckin` et `RecipeEditor` l'avaient déjà ; les éditeurs du
 *   Profil, non. Un tap qu'aucun enfant ne prend referme quand même le clavier :
 *   c'est la seule sortie du pavé NUMÉRIQUE, qui n'a pas de touche « OK ».
 *
 * ⚠️ Volontairement PAS de `keyboardDismissMode` : dans une feuille, le glissement
 * vers le bas est déjà le geste de fermeture (`Sheet.tsx`). Lui superposer un
 * second sens se réglerait au doigt, et un navigateur ne peut pas le montrer.
 * ⚠️ `lib/__tests__/clavierSaisie.test.ts` compte les surfaces qui doivent l'avoir.
 */
export const clavierScrollProps = {
  automaticallyAdjustKeyboardInsets: true,
  keyboardShouldPersistTaps: 'handled' as const,
};
