import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme, Radius, Spacing, Type, ThemePalette, Trait, Icone, CIBLE_TACTILE_MIN, OPACITE_PRESSION } from '../constants/theme';
import { PrimaryButton } from './ui';
import { Presse } from './Presse';
import { DureeIcon } from './Icons';
import { useDialog } from './Dialog';
import { ReminderTimeField } from './ReminderTimeField';
import { useReminder } from '../hooks/useReminder';
import { remindersSupported } from '../lib/notifications';
import { DEFAULT_REMINDER_TIME, ReminderTime, formatReminderTime } from '../lib/reminder';

/**
 * Propose le rappel quotidien, une seule fois, JUSTE APRÈS le reveal du 1er plan.
 *
 * 🔴 **Pourquoi ce composant existe.** Le rappel quotidien n'était proposé nulle
 * part : il ne vivait qu'à Profil → roue dentée → Notifications. La permission
 * système n'était donc quasiment jamais demandée, et le seul levier de rétention
 * que CLAUDE.md §5 autorise restait éteint pour presque tout le monde — sur un
 * produit dont le North Star est « 7 jours consécutifs dans les 14 premiers ».
 * *(Un commentaire de l'onboarding affirmait que le rappel « vit désormais dans
 * le reveal du 1er plan ». Il n'y était pas ; `FirstPlanReveal` disait
 * explicitement le contraire, et c'est lui qui avait raison.)*
 *
 * ⚠️ **APRÈS le premier plan, jamais avant.** Un prompt de permission iOS ne se
 * pose qu'UNE fois : refusé, il ne se redemande plus, et l'app ne peut plus que
 * renvoyer vers les réglages du téléphone. On ne le déclenche donc qu'une fois la
 * valeur livrée — la semaine de repas est déjà là, l'écran d'à côté la montre.
 *
 * ⚠️ **Rien n'est demandé au système tant qu'on n'a pas touché « Activer »** :
 * régler l'heure ne programme rien ici (contrairement au champ des Réglages, qui
 * édite un rappel déjà actif). Fermer sans rien faire ne pose aucune préférence.
 *
 * ⚠️ Le ton suit §10 : on dit à quoi ça sert, on ne fait pas peur de l'oubli.
 * Pas de série, pas de « ne décroche pas ».
 */
interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ReminderOffer({ visible, onClose }: Props) {
  const t = useTheme();
  const s = makeStyles(t);
  const { choose } = useReminder();
  const { notify } = useDialog();
  // Heure LOCALE à cet écran : elle ne devient une préférence qu'au moment où on
  // touche « Activer ». Le champ des Réglages, lui, émet à chaque changement —
  // c'est la différence entre proposer et régler.
  const [time, setTime] = useState<ReminderTime>(DEFAULT_REMINDER_TIME);
  const [enCours, setEnCours] = useState(false);

  if (!visible) return null;

  const activer = async () => {
    setEnCours(true);
    const ok = await choose(time);
    setEnCours(false);
    onClose();
    if (!ok) {
      notify({
        title: 'Notifications désactivées',
        message: 'Active les notifications de Kyroz dans les réglages de ton téléphone pour recevoir le rappel. Tu peux réessayer depuis Profil, roue dentée, Notifications.',
      });
    }
  };

  return (
    // `animationType="none"` : la carte n'anime pas la sienne, mais la `Modal`
    // fondrait par-dessus la sortie du reveal qui vient de se fermer — deux
    // fondus enchaînés sur la même zone se lisent comme un à-coup.
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={s.root}>
        <View style={s.card}>
          <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
            {/* `fete` et non `vide` : ce n'est pas le décor d'un écran creux, c'est
                le SUJET de la carte — même rôle que l'icône du reveal du 1er plan. */}
            <DureeIcon color={t.accent} size={Icone.fete} />
            <Text style={s.title}>Un rappel par jour ?</Text>
            <Text style={s.sub}>
              Une notification à l'heure que tu choisis, pour retrouver ton plan sans y penser.
              Rien d'autre : Kyroz ne t'enverra pas de notification en dehors de ça.
            </Text>

            <View style={s.champ}>
              <ReminderTimeField t={t} value={time} onChange={setTime} />
            </View>

            <Text style={s.recap}>Chaque jour à {formatReminderTime(time)}, avec une citation.</Text>

            <View style={s.actions}>
              <PrimaryButton t={t} label="Activer le rappel" onPress={activer} loading={enCours} />
              <Presse onPress={onClose} activeOpacity={OPACITE_PRESSION} accessibilityRole="button" style={s.plusTard}>
                <Text style={s.plusTardTexte}>Plus tard</Text>
              </Presse>
            </View>

            <Text style={s.aide}>Ça se change ou se coupe à tout moment dans le Profil.</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Le rappel a-t-il un sens à être proposé ici ?
 *
 * ⚠️ **Fonction à part, et exportée, parce que c'est elle qui décide** : sur le
 * web il n'existe aucune notification locale (`remindersSupported`), donc
 * proposer y serait promettre ce qu'on ne peut pas tenir — et les testeurs
 * ouvrent Kyroz dans leur navigateur. L'appelant ne doit alors PAS marquer
 * l'offre comme faite : elle attend la première ouverture sur mobile.
 */
export function offrirLeRappel(dejaRegle: boolean): boolean {
  return remindersSupported && !dejaRegle;
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: Spacing.xl },
    card: { width: '100%', maxWidth: 400, maxHeight: '88%', backgroundColor: t.card, borderWidth: Trait.fin, borderColor: t.line, borderRadius: Radius.xl },
    scroll: { padding: Spacing.xxl, alignItems: 'center' },
    title: { color: t.text, ...Type.h2, textAlign: 'center', marginTop: Spacing.md },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20, textAlign: 'center', marginTop: Spacing.sm, alignSelf: 'stretch' },
    champ: { marginTop: Spacing.xl, alignItems: 'center' },
    recap: { ...Type.caption, color: t.textTertiary, textAlign: 'center', marginTop: Spacing.md },
    actions: { alignSelf: 'stretch', marginTop: Spacing.xl, gap: Spacing.sm },
    plusTard: { alignItems: 'center', justifyContent: 'center', minHeight: CIBLE_TACTILE_MIN },
    plusTardTexte: { ...Type.bodyStrong, color: t.textSecondary },
    aide: { ...Type.micro, color: t.textTertiary, lineHeight: 16, textAlign: 'center', marginTop: Spacing.lg },
  });
}
