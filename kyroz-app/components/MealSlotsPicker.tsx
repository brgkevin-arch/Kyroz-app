import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Type, Spacing, Trait, Icone, CIBLE_TACTILE_MIN, OPACITE_PRESSION } from '../constants/theme';
import { Field, Segmented, PrimaryButton } from './ui';
import { IconeRepas } from './Icons';
import { MealPool, MealSlot, MealType } from '../lib/types';
import {
  BUILTIN_SLOTS, MAX_MEAL_SLOTS, POOL_LABELS, SLOT_LABEL_MAX,
  formatSlotTime, isBuiltinSlot, knownSlots, nextCustomSlotId, sanitizeSlot,
} from '../lib/mealSlots';

// ── Choisir ses repas de la journée, et en AJOUTER ───────────────────────────
//
// Un seul composant pour l'onboarding et pour les réglages : c'était déjà la
// règle pour l'ordre des repas (`MEAL_ORDER`) et pour les jours de repos
// (`deducedRestWeekdays`), pour la même raison — deux écrans qui posent le même
// réglage doivent le poser de la même façon, sinon il change de sens selon
// l'endroit où on l'ouvre.
//
// La sélection est une LISTE et non une rangée de puces : un créneau porte
// désormais une heure et un vivier, et une puce ne sait montrer qu'un libellé.
// Or l'heure n'est pas décorative — c'est elle qui ordonne la journée et qui
// décide quels repas sont « encore devant soi » après un écart.

const POOL_OPTS: { label: string; value: MealPool }[] = [
  { label: POOL_LABELS.breakfast, value: 'breakfast' },
  { label: POOL_LABELS.meal, value: 'meal' },
  { label: POOL_LABELS.snack, value: 'snack' },
];

/** Icône du vivier — un créneau créé n'a pas d'icône à lui, il emprunte celle de son vivier. */
const POOL_ICON: Record<MealPool, string> = { breakfast: 'breakfast', meal: 'dinner', snack: 'snack' };

export function MealSlotsPicker({
  t, customSlots, selected, onToggle, onSaveSlot, onDeleteSlot,
}: {
  t: ThemePalette;
  customSlots: MealSlot[];
  selected: MealType[];
  onToggle: (id: MealType) => void;
  onSaveSlot: (slot: MealSlot) => void;
  /** Supprime le créneau ET le retire de la sélection (c'est l'appelant qui fait les deux). */
  onDeleteSlot: (id: MealType) => void;
}) {
  // `null` = formulaire fermé. Sinon : le créneau en cours de saisie (neuf ou modifié).
  const [draft, setDraft] = useState<MealSlot | null>(null);
  const slots = knownSlots({ meal_slots: customSlots });
  const plein = slots.length >= MAX_MEAL_SLOTS;

  const ouvrirNeuf = () => setDraft({
    id: nextCustomSlotId(customSlots),
    label: '',
    hour: 10,
    minute: 0,
    pool: 'snack',
  });

  return (
    <View style={{ gap: Spacing.sm }}>
      {slots.map((slot) => {
        const on = selected.includes(slot.id);
        const perso = !isBuiltinSlot(slot.id);
        return (
          <View
            key={slot.id}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
              backgroundColor: t.card, borderRadius: Radius.card,
              paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
              borderWidth: Trait.controle, borderColor: on ? t.accent : 'transparent',
            }}
          >
            <TouchableOpacity
              activeOpacity={OPACITE_PRESSION}
              onPress={() => onToggle(slot.id)}
              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: CIBLE_TACTILE_MIN }}
            >
              <IconeRepas
                type={perso ? POOL_ICON[slot.pool] : slot.id}
                color={on ? t.text : t.textTertiary}
                size={Icone.standard}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ ...Type.bodySmallStrong, color: on ? t.text : t.textSecondary }} numberOfLines={1}>
                  {slot.label}
                </Text>
                <Text style={{ ...Type.caption, color: t.textTertiary, marginTop: Spacing.xs }}>
                  {formatSlotTime(slot)}{perso ? ` · ${POOL_LABELS[slot.pool]}` : ''}
                </Text>
              </View>
              <View style={{
                width: Icone.action, height: Icone.action, borderRadius: Icone.action / 2,
                borderWidth: Trait.controle, borderColor: on ? t.accent : t.lineStrong,
                backgroundColor: on ? t.accent : 'transparent',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {on && <Ionicons name="checkmark" size={Icone.petite} color={t.onAccent} />}
              </View>
            </TouchableOpacity>
            {perso && (
              <TouchableOpacity
                activeOpacity={OPACITE_PRESSION}
                onPress={() => setDraft(slot)}
                hitSlop={Spacing.sm}
                style={{ minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center' }}
              >
                <Text style={{ ...Type.captionStrong, color: t.accent }}>Modifier</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {draft ? (
        <SlotForm
          t={t}
          draft={draft}
          existant={customSlots.some((s) => s.id === draft.id)}
          onCancel={() => setDraft(null)}
          onSave={(s) => { onSaveSlot(s); setDraft(null); }}
          onDelete={() => { onDeleteSlot(draft.id); setDraft(null); }}
        />
      ) : (
        <TouchableOpacity
          activeOpacity={OPACITE_PRESSION}
          onPress={ouvrirNeuf}
          disabled={plein}
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
            minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button,
            backgroundColor: t.fill, opacity: plein ? OPACITE_PRESSION : 1,
          }}
        >
          <Ionicons name="add" size={Icone.standard} color={plein ? t.textTertiary : t.text} />
          <Text style={{ ...Type.bodyStrong, color: plein ? t.textTertiary : t.text }}>Ajouter un repas</Text>
        </TouchableOpacity>
      )}

      {plein && !draft && (
        <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 18 }}>
          {MAX_MEAL_SLOTS} repas par jour, c'est le maximum : en deçà de cette taille de
          portion, aucune recette du catalogue ne sait viser la cible.
        </Text>
      )}
    </View>
  );
}

/**
 * Formulaire d'un créneau créé. INLINE et non en feuille modale, volontairement :
 * il s'ouvre déjà depuis une feuille (les réglages du Profil), et sur
 * react-native-web une `Modal` se place selon l'ordre du DOM, pas selon son
 * `z-index` (cf. CLAUDE.md §11). Une seconde feuille par-dessus la première est
 * exactement le montage qui a rendu les dialogues invisibles.
 */
function SlotForm({
  t, draft, existant, onSave, onCancel, onDelete,
}: {
  t: ThemePalette;
  draft: MealSlot;
  existant: boolean;
  onSave: (s: MealSlot) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [label, setLabel] = useState(draft.label);
  const [pool, setPool] = useState<MealPool>(draft.pool);
  // Heure et minutes en TEXTE tant que l'utilisateur tape : borner à chaque frappe
  // réécrirait ce qu'il est en train de saisir (taper « 18 » passerait par « 1 »,
  // puis un clamp le renverrait). Le bornage se fait au `onBlur` — et surtout PAS
  // à `onEndEditing`, qui est un no-op sur react-native-web (CLAUDE.md §11).
  const [hour, setHour] = useState(String(draft.hour));
  const [minute, setMinute] = useState(String(draft.minute ?? 0).padStart(2, '0'));

  const borner = (v: string, max: number) => {
    const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
  };
  const valide = label.trim().length > 0;

  const enregistrer = () => {
    if (!valide) return;
    onSave(sanitizeSlot({ id: draft.id, label, pool, hour: borner(hour, 23), minute: borner(minute, 59) }));
  };

  return (
    <View style={{
      backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.lg,
      borderWidth: Trait.fin, borderColor: t.line,
    }}>
      <Field
        t={t} label="Nom du repas" value={label} onChangeText={setLabel}
        placeholder="Shaker post-training" maxLength={SLOT_LABEL_MAX}
        autoCapitalize="sentences"
      />
      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <Field
            t={t} label="Heure" suffix="h" value={hour} keyboardType="number-pad"
            onChangeText={setHour} onBlur={() => setHour(String(borner(hour, 23)))}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            t={t} label="Minutes" suffix="min" value={minute} keyboardType="number-pad"
            onChangeText={setMinute} onBlur={() => setMinute(String(borner(minute, 59)).padStart(2, '0'))}
          />
        </View>
      </View>
      <View style={{ gap: Spacing.sm }}>
        <Text style={{ ...Type.captionStrong, color: t.textSecondary }}>Kyroz y sert plutôt</Text>
        <Segmented t={t} options={POOL_OPTS} value={pool} onChange={setPool} />
        <Text style={{ ...Type.caption, color: t.textTertiary, lineHeight: 18 }}>
          C'est le vivier de recettes dans lequel Kyroz pioche pour ce créneau, et la
          taille de portion qu'il y vise.
        </Text>
      </View>
      {!valide && (
        <Text style={{ ...Type.caption, color: t.textTertiary }}>Donne un nom à ce repas pour le retrouver dans ton plan.</Text>
      )}
      <PrimaryButton t={t} label="Enregistrer ce repas" onPress={enregistrer} muted={!valide} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity activeOpacity={OPACITE_PRESSION} onPress={onCancel} hitSlop={Spacing.sm}
          style={{ minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center' }}>
          <Text style={{ ...Type.captionStrong, color: t.textSecondary }}>Annuler</Text>
        </TouchableOpacity>
        {existant && (
          <TouchableOpacity activeOpacity={OPACITE_PRESSION} onPress={onDelete} hitSlop={Spacing.sm}
            style={{ minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center' }}>
            <Text style={{ ...Type.captionStrong, color: t.danger }}>Supprimer</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/** Les 4 créneaux intégrés — ré-exporté pour que les écrans n'importent qu'un module. */
export { BUILTIN_SLOTS };
