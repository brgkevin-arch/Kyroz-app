import React from 'react';
import { Presse } from './Presse';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
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

export function Segmented<T extends string | number>({
  t, options, value, onChange,
}: { t: ThemePalette; options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: Radius.button, padding: Spacing.xs, gap: Spacing.xs }}>
      {/* Rayon INTÉRIEUR = extérieur − le retrait (4) : c'est ce qui rend les deux
          courbes concentriques. Il était écrit 11 pour un cadre à 14, donc le
          curseur ne suivait pas tout à fait la courbe de son rail. */}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Presse key={String(o.value)} onPress={() => onChange(o.value)} activeOpacity={OPACITE_PRESSION}
            style={{ flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.button - 4, alignItems: 'center', backgroundColor: on ? t.accent : 'transparent' }}>
            <Text style={{ ...Type.bodySmallStrong, color: on ? t.onAccent : t.textSecondary }}>{o.label}</Text>
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
