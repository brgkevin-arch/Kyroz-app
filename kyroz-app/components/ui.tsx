import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, ActivityIndicator, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing, Type, cardShadow, CIBLE_TACTILE_MIN } from '../constants/theme';

// ── Primitives UI thémées, réutilisables partout ─────────────────────────────

export function Card({ t, style, children }: { t: ThemePalette; style?: ViewStyle; children: React.ReactNode }) {
  return (
    <View style={[{ backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.xl }, cardShadow(t), style]}>
      {children}
    </View>
  );
}

export function PrimaryButton({
  t, label, onPress, disabled, loading,
}: { t: ThemePalette; label: string; onPress: () => void; disabled?: boolean; loading?: boolean }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: t.accent,
        borderRadius: Radius.button,
        paddingVertical: Spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {loading
        ? <ActivityIndicator color={t.onAccent} />
        : <Text style={{ ...Type.h3, color: t.onAccent }}>{label}</Text>}
    </TouchableOpacity>
  );
}

export function Chip({
  t, label, selected, onPress,
}: { t: ThemePalette; label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
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
    </TouchableOpacity>
  );
}

export function OptionCard({
  t, title, subtitle, selected, onPress,
}: { t: ThemePalette; title: string; subtitle?: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        {
          backgroundColor: t.card,
          borderRadius: Radius.card,
          padding: Spacing.xl,
          borderWidth: 1.5,
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
        borderWidth: 2, borderColor: selected ? t.accent : t.lineStrong,
        backgroundColor: selected ? t.accent : 'transparent',
        alignItems: 'center', justifyContent: 'center',
      }}>
        {selected && <Ionicons name="checkmark" size={15} color={t.onAccent} />}
      </View>
    </TouchableOpacity>
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
        borderRadius: Radius.button, borderWidth: 1, borderColor: t.line,
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
          <TouchableOpacity key={String(o.value)} onPress={() => onChange(o.value)} activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.button - 4, alignItems: 'center', backgroundColor: on ? t.accent : 'transparent' }}>
            <Text style={{ ...Type.bodySmallStrong, color: on ? t.onAccent : t.textSecondary }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function SectionLabel({ t, children }: { t: ThemePalette; children: React.ReactNode }) {
  return (
    <Text style={{
      ...Type.overline, color: t.textTertiary, textTransform: 'uppercase',
    }}>
      {children}
    </Text>
  );
}
