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
// ⚠️ Pas de cycle : `GuidedTour` n'importe rien d'ici (vérifié le 2026-08-10 en
// montant `MenuRow`). Si ça changeait, `useTourTarget` devrait déménager dans un
// module sans dépendance — c'est déjà le patron de `lib/tours.ts`.
import { useTourTarget } from './GuidedTour';

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

export function Field({
  t, label, suffix, ...props
}: { t: ThemePalette; label: string; suffix?: string } & TextInputProps) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <Text style={{ ...Type.captionStrong, color: t.textSecondary }}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: t.scheme === 'dark' ? t.fill : t.card,
        borderRadius: Radius.button, borderWidth: Trait.fin, borderColor: t.line,
        paddingHorizontal: Spacing.lg,
      }}>
        <TextInput
          placeholderTextColor={t.textQuaternary}
          autoComplete="off"
          autoCorrect={false}
          autoCapitalize="none"
          // minWidth: 0 → indispensable pour que l'input en flex:1 puisse RÉTRÉCIR
          // dans le cadre (sinon, surtout sur web, sa largeur intrinsèque pousse
          // l'unité hors de la bordure). Avec un suffixe, valeur alignée à droite
          // → collée à l'unité (« 30 min ») ; sans suffixe (ex. « Nom »), à gauche.
          style={{ ...Type.h3, flex: 1, minWidth: 0, paddingVertical: Spacing.lg, color: t.text, textAlign: suffix ? 'right' : 'left' }}
          {...props}
        />
        {suffix ? <Text style={{ ...Type.body, color: t.textTertiary, marginLeft: Spacing.sm }}>{suffix}</Text> : null}
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
}: { t: ThemePalette; options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  const reduire = useReduceMotion();
  const [larg, setLarg] = React.useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const position = React.useRef(new Animated.Value(index)).current;
  const pose = React.useRef(false);

  // Chaque option occupe une part égale du rail, moins les gouttières.
  const utile = Math.max(0, larg - Spacing.xs * 2 - Spacing.xs * (options.length - 1));
  const pas = options.length > 0 ? utile / options.length : 0;

  React.useEffect(() => {
    if (!pose.current) { pose.current = true; position.setValue(index); return; }
    Animated.spring(position, {
      toValue: index,
      useNativeDriver: false,
      ...ressortRN(ressortReduit(RESSORT.pose, reduire)),
    }).start();
  }, [index, reduire, position]);

  // Une seule option : rien à départager, donc rien à faire glisser.
  const glissant = options.length > 1 && larg > 0;

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
export function MenuRow({
  t, label, value, onPress, last, readonly, tourId,
}: { t: ThemePalette; label: string; value: string; onPress: () => void; last?: boolean; readonly?: boolean; tourId?: string }) {
  // `tourId` optionnel : rend CETTE ligne ciblable par la visite guidée. Sans lui
  // aucune n'était ancrable — un TouchableOpacity rendu par une fonction n'expose
  // pas de ref à l'appelant.
  const tourRef = useTourTarget(tourId);
  return (
    <Presse ref={tourRef} onPress={onPress} activeOpacity={readonly ? 1 : OPACITE_PRESSION} disabled={readonly}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.lg }, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.line }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...Type.h3, color: t.text, letterSpacing: -0.3 }}>{label}</Text>
        <Text style={{ ...Type.bodySmall, color: t.textTertiary, marginTop: Spacing.xs }} numberOfLines={1}>{value}</Text>
      </View>
      {!readonly && <Ionicons name="chevron-forward" size={Icone.standard} color={t.textQuaternary} />}
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
