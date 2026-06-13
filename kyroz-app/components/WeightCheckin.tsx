import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image, Alert, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing } from '../constants/theme';
import { Field, PrimaryButton, SectionLabel, Segmented } from './ui';
import { WeightChart } from './WeightChart';
import { useWeightLog } from '../hooks/useWeightLog';
import { useProfile } from '../hooks/useProfile';
import { pickProgressPhoto, cameraAvailable, PhotoSource } from '../lib/photos';
import { todayStamp, localStamp, DEFAULT_WEIGH_IN_FREQUENCY, WEIGH_IN_LABELS } from '../lib/weight';
import { applyWeighInReminder } from '../lib/notifications';
import { WeighInFrequency } from '../lib/types';

interface Props {
  t: ThemePalette;
  onClose?: () => void;
  dragHandlers?: any;
}

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Timeline du sélecteur de date.
const FUTURE_DAYS = 7;   // jours futurs grisés (aperçu) à gauche
const CHIP_W = 46;
const CHIP_GAP = 6;

export function WeightCheckin({ t, onClose, dragHandlers }: Props) {
  const s = useMemo(() => makeStyles(t), [t]);
  const { entries, photos, last, logWeight, removeWeight, setPhoto } = useWeightLog();

  // Confirmation multiplateforme (Alert à boutons ne rend rien sur web).
  const confirmDelete = (d: string, w: number) => {
    const doIt = () => { removeWeight(d); setSaved(null); };
    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && window.confirm(`Supprimer la pesée du ${frDate(d)} (${w} kg) ?`)) doIt();
      return;
    }
    Alert.alert('Supprimer cette pesée ?', `${frDate(d)} · ${w} kg`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: doIt },
    ]);
  };
  const { profile, saveProfile } = useProfile();
  const freq: WeighInFrequency = profile?.weigh_in_frequency ?? DEFAULT_WEIGH_IN_FREQUENCY;
  const setFreq = (f: WeighInFrequency) => {
    if (!profile) return;
    saveProfile({ ...profile, weigh_in_frequency: f });
    applyWeighInReminder(f, last?.date ?? null); // ré-arme la notif sur la nouvelle cadence
  };
  const [date, setDate] = useState(todayStamp());
  const [val, setVal] = useState('');
  const [note, setNote] = useState('');
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  // Confirmation structurée après enregistrement.
  const [saved, setSaved] = useState<{ updated: boolean; label: string; delta: number | null; date: string } | null>(null);

  // Message honnête : explique si (et pourquoi) le plan a été ajusté.
  const planStatusMsg = (d: string) => {
    if (d !== todayStamp()) return 'Ajouté à ton historique. Le plan ne suit que ta pesée du jour.';
    if (profile?.macro_mode === 'manual') return 'Macros en mode manuel : le plan garde tes cibles fixées (modifiable dans Profil).';
    return 'Calories, macros et plan ajustés automatiquement.';
  };

  // Timeline du sélecteur de date, de GAUCHE à DROITE (sens chronologique) :
  //   [passé : tout l'historique … J-1] · [aujourd'hui, au centre] · [futur J+1…J+7 grisé]
  // → glisser à gauche = remonter le passé ; à droite = aperçu (grisé) du futur.
  const days = useMemo(() => {
    const mk = (offset: number) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + offset);
      return {
        iso: localStamp(d),                                  // heure locale (cohérent avec todayStamp)
        wd: d.toLocaleDateString('fr-FR', { weekday: 'short' }),
        num: d.getDate(),
        today: offset === 0,
        future: offset > 0,
      };
    };
    // Profondeur du passé : tout l'historique (min 7 j pour laisser de la marge de backfill).
    let back = 7;
    if (entries.length) {
      const first = Date.parse(entries[0].date + 'T00:00:00');
      const today0 = new Date(); today0.setHours(0, 0, 0, 0);
      const span = Math.round((today0.getTime() - first) / 86400000);
      back = Math.min(Math.max(back, span), 400);
    }
    const out = [];
    for (let i = back; i >= 1; i--) out.push(mk(-i));         // passé (gauche, du + ancien au + récent)
    out.push(mk(0));                                          // aujourd'hui (centre)
    for (let i = 1; i <= FUTURE_DAYS; i++) out.push(mk(i));   // futur grisé (droite)
    return out;
  }, [entries]);

  const stripRef = useRef<ScrollView | null>(null);
  const centered = useRef(false);
  // Centre la timeline sur « aujourd'hui » au premier rendu (position = nb de jours passés).
  const centerOnToday = () => {
    if (centered.current) return;
    const idx = days.findIndex((d) => d.today);
    if (idx < 0) return;
    centered.current = true;
    const x = idx * (CHIP_W + CHIP_GAP) + CHIP_W / 2 - (width / 2);
    stripRef.current?.scrollTo({ x: Math.max(0, x), animated: false });
  };

  // Sélectionne une date et préremplit avec la pesée existante de ce jour, le cas échéant.
  const pickDate = (iso: string) => {
    setDate(iso);
    setSaved(null);
    const existing = entries.find((e) => e.date === iso);
    setVal(existing ? String(existing.weight_kg) : '');
    setNote(existing?.note ?? '');
  };

  const pick = async (src: PhotoSource) => {
    const uri = await pickProgressPhoto(src);
    if (uri) { setPendingPhoto(uri); setSaved(null); }
  };
  const choosePhoto = () => {
    if (!cameraAvailable) { pick('library'); return; }
    Alert.alert('Photo de progression', 'Elle reste sur ton téléphone.', [
      { text: 'Prendre une photo', onPress: () => pick('camera') },
      { text: 'Choisir dans la galerie', onPress: () => pick('library') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const width = Dimensions.get('window').width - Spacing.xxl * 2;
  const wN = parseFloat(val.replace(',', '.'));
  const valid = wN >= 40 && wN <= 250;

  const save = async () => {
    if (!valid) return;
    const updated = entries.some((e) => e.date === date);
    // Delta vs le point chronologiquement précédent (correct même en backfill).
    const before = entries.filter((e) => e.date < date).sort((a, b) => a.date.localeCompare(b.date)).pop();
    const delta = before ? Math.round((wN - before.weight_kg) * 10) / 10 : null;

    await logWeight(wN, note, date);
    if (pendingPhoto) await setPhoto(date, pendingPhoto);

    const label = date === todayStamp() ? "aujourd'hui" : frDate(date);
    setSaved({ updated, label, delta, date });
    setVal('');
    setNote('');
    setPendingPhoto(null);
  };

  const reversed = [...entries].reverse().slice(0, 10);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.header} {...(dragHandlers ?? {})}>
        <Text style={s.title}>Suivi du poids</Text>
        <Text style={s.sub}>
          Renseigne ton poids chaque semaine : Kyroz réajuste automatiquement tes calories, tes macros et ton plan à mesure que tu évolues.
        </Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Sélecteur de date : aujourd'hui centré · passé à droite · futur grisé à gauche */}
        <ScrollView
          ref={stripRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dateRow}
          onContentSizeChange={centerOnToday}
        >
          {days.map((d) => {
            const on = d.iso === date;
            const has = entries.some((e) => e.date === d.iso);
            if (d.future) {
              return (
                <View key={d.iso} style={[s.dateChip, s.dateChipFuture]}>
                  <Text style={[s.dateWd, { color: t.textQuaternary }]}>{d.wd}</Text>
                  <Text style={[s.dateNum, { color: t.textQuaternary }]}>{d.num}</Text>
                </View>
              );
            }
            return (
              <TouchableOpacity
                key={d.iso}
                onPress={() => pickDate(d.iso)}
                activeOpacity={0.85}
                style={[s.dateChip, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}
              >
                <Text style={[s.dateWd, { color: on ? t.onAccent : t.textTertiary }]}>{d.today ? 'Auj.' : d.wd}</Text>
                <Text style={[s.dateNum, { color: on ? t.onAccent : t.textSecondary }]}>{d.num}</Text>
                {has && <View style={[s.dateDot, { backgroundColor: on ? t.onAccent : t.textTertiary }]} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.inputRow}>
          <View style={{ flex: 1 }}>
            <Field
              t={t}
              label={date === todayStamp() ? "Ton poids aujourd'hui" : `Ton poids le ${frDate(date)}`}
              suffix="kg"
              keyboardType="decimal-pad"
              value={val}
              onChangeText={(x) => { setVal(x); setSaved(null); }}
              placeholder={last ? String(last.weight_kg) : '80'}
            />
          </View>
        </View>
        <Field
          t={t}
          label="Note (optionnel)"
          value={note}
          onChangeText={(x) => { setNote(x); setSaved(null); }}
          placeholder="ex. voyage, malade, grosse semaine d'entraînement…"
          autoCapitalize="sentences"
        />

        {/* Photo de progression (optionnelle, reste sur l'appareil) */}
        {pendingPhoto ? (
          <View style={s.photoPreview}>
            <Image source={{ uri: pendingPhoto }} style={s.photoBig} />
            <TouchableOpacity onPress={() => setPendingPhoto(null)} style={s.photoRemove} hitSlop={8}>
              <Ionicons name="close-circle" size={26} color={t.text} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={choosePhoto} style={s.photoBtn} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={18} color={t.text} />
            <Text style={s.photoBtnTxt}>Ajouter une photo de progression</Text>
          </TouchableOpacity>
        )}
        <Text style={s.photoHint}>🔒 Tes photos restent sur ton téléphone, jamais envoyées.</Text>

        <PrimaryButton t={t} label="Enregistrer" onPress={save} disabled={!valid} />

        {saved && (
          <View style={s.confirm}>
            <Text style={s.confirmTitle}>
              {`✓ Point du ${saved.label} ${saved.updated ? 'mis à jour' : 'enregistré'}`}
              {saved.delta != null ? `  ·  ${saved.delta > 0 ? '+' : ''}${saved.delta} kg` : ''}
            </Text>
            <Text style={s.confirmSub}>{planStatusMsg(saved.date)}</Text>
          </View>
        )}

        <SectionLabel t={t}>Évolution</SectionLabel>
        <WeightChart t={t} entries={entries} width={width} />

        {/* Cadence de pesée choisie par l'utilisateur → pilote le rappel de check-in */}
        <SectionLabel t={t}>Rappel de pesée</SectionLabel>
        <Segmented<WeighInFrequency>
          t={t}
          value={freq}
          onChange={setFreq}
          options={[
            { label: 'Jour', value: 'daily' },
            { label: 'Sem.', value: 'weekly' },
            { label: '2 sem.', value: 'biweekly' },
            { label: 'Mois', value: 'monthly' },
          ]}
        />
        <Text style={s.freqHint}>On te proposera un check-in : {WEIGH_IN_LABELS[freq].toLowerCase()}.</Text>

        {reversed.length > 0 && (
          <>
            <SectionLabel t={t}>Historique</SectionLabel>
            <View style={s.histCard}>
              {reversed.map((e, i) => {
                const prev = reversed[i + 1];
                const d = prev ? Math.round((e.weight_kg - prev.weight_kg) * 10) / 10 : null;
                return (
                  <View key={e.date} style={[s.histItem, i < reversed.length - 1 && s.histDivider]}>
                    <View style={s.histRow}>
                      <Text style={s.histDate}>{frDate(e.date)}</Text>
                      <Text style={s.histW}>{e.weight_kg} kg</Text>
                      <Text style={[s.histD, { color: d == null ? t.textTertiary : d <= 0 ? t.success : t.warning }]}>
                        {d == null ? '—' : `${d > 0 ? '+' : ''}${d}`}
                      </Text>
                      <TouchableOpacity onPress={() => confirmDelete(e.date, e.weight_kg)} hitSlop={8} style={s.histDel}>
                        <Ionicons name="close" size={15} color={t.textQuaternary} />
                      </TouchableOpacity>
                    </View>
                    {e.note ? <Text style={s.histNote}>{e.note}</Text> : null}
                    {photos[e.date] ? (
                      <Image source={{ uri: photos[e.date] }} style={s.histPhoto} />
                    ) : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    header: { paddingHorizontal: Spacing.xxl, paddingBottom: 8, gap: 8 },
    title: { color: t.text, fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    sub: { color: t.textSecondary, fontSize: 14, lineHeight: 20 },
    content: { padding: Spacing.xxl, paddingTop: 12, gap: 14, paddingBottom: 40 },
    dateRow: { gap: CHIP_GAP, paddingVertical: 2 },
    dateChip: { width: CHIP_W, height: 56, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
    dateChipFuture: { backgroundColor: t.fill, borderColor: t.line, opacity: 0.5 },
    dateWd: { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },
    dateNum: { fontSize: 15, fontWeight: '700' },
    dateDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 7 },
    inputRow: { flexDirection: 'row', gap: 12 },
    confirm: { backgroundColor: t.fill, borderRadius: Radius.md, padding: 14, gap: 3 },
    confirmTitle: { color: t.text, fontSize: 15, fontWeight: '700' },
    confirmSub: { color: t.textSecondary, fontSize: 13 },
    freqHint: { color: t.textTertiary, fontSize: 12, lineHeight: 16, marginTop: -6 },
    histCard: { backgroundColor: t.card, borderRadius: Radius.md, borderWidth: 1, borderColor: t.line, paddingHorizontal: 16 },
    histItem: { paddingVertical: 13 },
    histRow: { flexDirection: 'row', alignItems: 'center' },
    histDivider: { borderBottomWidth: 1, borderBottomColor: t.line },
    histDate: { flex: 1, color: t.textSecondary, fontSize: 14 },
    histW: { color: t.text, fontSize: 15, fontWeight: '700', width: 80, textAlign: 'right' },
    histD: { width: 56, textAlign: 'right', fontSize: 14, fontWeight: '600' },
    histDel: { marginLeft: 10, padding: 2 },
    histNote: { color: t.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 5, fontStyle: 'italic' },
    histPhoto: { width: 64, height: 84, borderRadius: 10, marginTop: 8, backgroundColor: t.fill },
    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.md, borderWidth: 1, borderColor: t.line, borderStyle: 'dashed' },
    photoBtnTxt: { color: t.text, fontSize: 15, fontWeight: '600' },
    photoPreview: { alignSelf: 'flex-start' },
    photoBig: { width: 150, height: 200, borderRadius: Radius.md, backgroundColor: t.fill },
    photoRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: t.bg, borderRadius: 14 },
    photoHint: { color: t.textTertiary, fontSize: 12, lineHeight: 16, marginTop: -4 },
  });
}
