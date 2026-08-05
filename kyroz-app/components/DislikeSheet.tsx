import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { ThemePalette, Radius, Type, Spacing } from '../constants/theme';
import { PrimaryButton } from './ui';

// ── « C'est quoi qui te gêne vraiment ? » ───────────────────────────────────
// S'ouvre quand l'utilisateur a masqué trop de recettes (👎) et que son pool
// pour un repas descend sous le seuil. Au lieu de bloquer ou de casser le régime,
// on lui demande l'INGRÉDIENT en cause : on l'ajoute aux aliments évités et on
// ré-affiche les plats masqués qui ne le contiennent pas (cf. lib/dislike.ts).

export function DislikeSheet({
  t, candidates, onPick, onClose, dragHandlers,
}: {
  t: ThemePalette;
  candidates: { label: string; kw: string; count: number }[];
  onPick: (kw: string) => void;
  onClose: () => void;
  dragHandlers?: any;
}) {
  const s = makeStyles(t);
  const [sel, setSel] = useState<string | null>(null);
  const [custom, setCustom] = useState('');
  const chosen = custom.trim() ? custom.trim() : sel;

  return (
    <View style={s.wrap}>
      <View {...(dragHandlers ?? {})}>
        <Text style={s.title}>C'est quoi qui te gêne ?</Text>
        <Text style={s.sub}>
          Tu as écarté pas mal de plats. Dis-nous l'ingrédient que tu n'aimes pas : on l'évite
          partout et on te ramène les plats qui ne le contiennent pas.
        </Text>
      </View>

      {candidates.length > 0 && (
        <View style={s.chips}>
          {candidates.map((c) => {
            const on = !custom.trim() && sel === c.kw;
            return (
              <TouchableOpacity
                key={c.kw} activeOpacity={0.85}
                onPress={() => { setSel(c.kw); setCustom(''); }}
                style={[s.chip, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}
              >
                <Text style={[s.chipLabel, { color: on ? t.onAccent : t.text }]}>{c.label}</Text>
                <Text style={[s.chipSub, { color: on ? t.onAccent : t.textTertiary }]}>
                  dans {c.count} plat{c.count > 1 ? 's' : ''} écarté{c.count > 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={s.customRow}>
        <Text style={s.customLabel}>{candidates.length > 0 ? 'Ou un autre ingrédient' : 'Quel ingrédient ?'}</Text>
        <View style={[s.inputBox, { borderColor: t.line }]}>
          <TextInput
            value={custom} onChangeText={(v) => { setCustom(v); setSel(null); }}
            placeholder="Ex. coriandre…" placeholderTextColor={t.textQuaternary}
            autoCapitalize="none" style={s.input}
          />
        </View>
      </View>

      <PrimaryButton
        t={t}
        label={chosen ? `Éviter « ${chosen} »` : 'Choisis un ingrédient'}
        onPress={() => { if (chosen) { onPick(chosen); onClose(); } }}
      />
      <TouchableOpacity onPress={onClose} hitSlop={8} style={{ alignSelf: 'center' }}>
        <Text style={s.skip}>Plus tard</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    wrap: { padding: Spacing.xxl, gap: Spacing.lg },
    title: { color: t.text, ...Type.h2 },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20, marginTop: Spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
    chip: { borderWidth: 1, borderRadius: Radius.card, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, gap: Spacing.xs, minWidth: '47%', flexGrow: 1 },
    chipLabel: { ...Type.label },
    chipSub: { ...Type.caption },
    customRow: { gap: Spacing.sm },
    customLabel: { ...Type.captionStrong, color: t.textSecondary },
    inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.button, paddingHorizontal: Spacing.lg },
    input: { ...Type.input, flex: 1, paddingVertical: Spacing.lg, color: t.text },
    skip: { ...Type.bodySmallStrong, color: t.textTertiary, paddingVertical: Spacing.xs },
  });
}
