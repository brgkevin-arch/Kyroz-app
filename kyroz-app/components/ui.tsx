import React from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ViewStyle, TextStyle, ActivityIndicator, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing, Type, cardShadow } from '../constants/theme';

// ── Primitives UI thémées, réutilisables partout ─────────────────────────────

export function Card({ t, style, children }: { t: ThemePalette; style?: ViewStyle; children: React.ReactNode }) {
  return (
    <View style={[{ backgroundColor: t.card, borderRadius: Radius.lg, padding: Spacing.xl }, cardShadow(t), style]}>
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
        borderRadius: Radius.md,
        paddingVertical: 17,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      }}
    >
      {loading
        ? <ActivityIndicator color={t.onAccent} />
        : <Text style={{ color: t.onAccent, fontSize: 17, fontWeight: '700' }}>{label}</Text>}
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
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: Radius.pill,
        backgroundColor: selected ? t.accent : t.fill,
        borderWidth: 1,
        borderColor: selected ? t.accent : t.line,
      }}
    >
      <Text style={{ color: selected ? t.onAccent : t.textSecondary, fontSize: 14, fontWeight: '600' }}>
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
          borderRadius: Radius.md,
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
        <Text style={{ color: t.text, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>{title}</Text>
        {subtitle ? (
          <Text style={{ color: t.textSecondary, fontSize: 13, marginTop: 4 }}>{subtitle}</Text>
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
    <View style={{ gap: 8 }}>
      <Text style={{ color: t.textSecondary, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: t.scheme === 'dark' ? t.fill : t.card,
        borderRadius: Radius.sm, borderWidth: 1, borderColor: t.line,
        paddingHorizontal: 16,
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
          style={{ flex: 1, minWidth: 0, paddingVertical: 16, fontSize: 18, fontWeight: '600', color: t.text, textAlign: suffix ? 'right' : 'left' }}
          {...props}
        />
        {suffix ? <Text style={{ color: t.textTertiary, fontSize: 15, marginLeft: 6 }}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Segmented<T extends string | number>({
  t, options, value, onChange,
}: { t: ThemePalette; options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', backgroundColor: t.fill, borderRadius: 14, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <TouchableOpacity key={String(o.value)} onPress={() => onChange(o.value)} activeOpacity={0.8}
            style={{ flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: 'center', backgroundColor: on ? t.accent : 'transparent' }}>
            <Text style={{ color: on ? t.onAccent : t.textSecondary, fontWeight: '700', fontSize: 14 }}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function SectionLabel({ t, children }: { t: ThemePalette; children: React.ReactNode }) {
  return (
    <Text style={{
      color: t.textTertiary, fontSize: 12, fontWeight: '700',
      letterSpacing: 0.6, textTransform: 'uppercase',
    }}>
      {children}
    </Text>
  );
}
