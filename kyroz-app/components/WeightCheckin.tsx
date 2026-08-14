import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Image, TouchableOpacity } from 'react-native';
import { Presse } from './Presse';
import { ConfirmationEnLigne } from './ConfirmationEnLigne';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing, Type, Fond, Trait, Icone, OPACITE_PRESSION } from '../constants/theme';
import { SHEET_MAX_WIDTH } from '../constants/layout';
import { Field, PrimaryButton, SectionLabel, Segmented } from './ui';
import { WeightChart } from './WeightChart';
import { TrackVerdict, PhotoCompare } from './Transformation';
import { planFlags, trackingTarget } from '../lib/tdee';
import { useWeightLog } from '../hooks/useWeightLog';
import { useProfile } from '../hooks/useProfile';
import { pickProgressPhoto, cameraAvailable, PhotoSource } from '../lib/photos';
import { todayStamp, localStamp, DEFAULT_WEIGH_IN_FREQUENCY, WEIGH_IN_LABELS } from '../lib/weight';
import { applyWeighInReminder } from '../lib/notifications';
import { WeighInFrequency } from '../lib/types';
import { LocalIcon } from './Icons';

interface Props {
  t: ThemePalette;
  onClose?: () => void;
  dragHandlers?: any;
  sheetScrollProps?: any;     // injecté par <Sheet> : lie le défilement à la fermeture
}

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Timeline du sélecteur de date.
const FUTURE_DAYS = 7;   // jours futurs grisés (aperçu) à gauche
const CHIP_W = 46;
const CHIP_GAP = 6;

export function WeightCheckin({ t, onClose, dragHandlers, sheetScrollProps }: Props) {
  const s = useMemo(() => makeStyles(t), [t]);
  const { entries, photos, last, logWeight, removeWeight, setPhoto } = useWeightLog();
  // Quelle pesée attend sa confirmation (par sa DATE, qui est sa clé).
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  // Le choix de la source de photo, posé DANS la feuille pour la même raison.
  const [choixPhoto, setChoixPhoto] = useState(false);

  // 🔴 LA CONFIRMATION VIT DANS LA FEUILLE, PLUS DANS UNE BOÎTE DE DIALOGUE
  // (2026-08-14). Cet écran vit dans une feuille, donc dans une `Modal` ; la
  // boîte de dialogue en monte une seconde, et iOS refuse de la présenter —
  // silencieusement. Mesuré au simulateur sur le même mécanisme.
  // ⚠️ Ce fichier avait DÉJÀ contourné un piège de la même famille une fois, avec
  // un `window.confirm` (la boîte grise du navigateur, hors charte). C'est la
  // deuxième fois que la confirmation d'une pesée tombe : le motif n'est pas la
  // malchance, c'est qu'une modale ouverte depuis une modale ne tient nulle part.
  // ⚠️ ET LE CHOIX DE LA PHOTO TOMBAIT PAREIL — trouvé en écrivant le garde-fou,
  // pas en regardant l'écran : `choosePhoto` ouvrait un `choose()`, donc une
  // troisième modale, depuis la même feuille. « Ajouter une photo de progression »
  // ne répondait donc pas non plus sur iPhone. C'est le compteur qui l'a désigné.
  const supprimerPesee = (d: string) => {
    setAConfirmer(null);
    removeWeight(d);
    setSaved(null);
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

  // Objectif de SUIVI : la date que le moteur tiendra, pas celle qui a été saisie.
  // Coûte une simulation, d'où le mémo — elle ne bouge que si le profil bouge.
  const suiviTarget = useMemo(
    () => (profile ? trackingTarget(profile, todayStamp()) : undefined),
    [profile?.goal_target?.target_date, profile?.goal_target?.target_weight_kg, profile?.weight_kg, profile?.target_kcal], // eslint-disable-line react-hooks/exhaustive-deps
  );

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
    // Sans appareil photo, il n'y a pas de choix à poser : on va droit au but.
    if (!cameraAvailable) { pick('library'); return; }
    setChoixPhoto(true);
  };
  const choisirSource = (src: PhotoSource) => { setChoixPhoto(false); pick(src); };

  // ⚠️ La largeur du graphe est celle de la FEUILLE, pas de l'écran : sur iPad
  // la feuille est bornée à SHEET_MAX_WIDTH, et lire l'écran (1024) faisait
  // déborder la courbe hors de son cadre. `useWindowDimensions` et non
  // `Dimensions.get` pour suivre la rotation.
  const { width: winW } = useWindowDimensions();
  const width = Math.min(winW, SHEET_MAX_WIDTH) - Spacing.xxl * 2;
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

      {/* Seul le ScrollView VERTICAL reçoit `sheetScrollProps` — la timeline
          horizontale juste en dessous ne doit pas fermer la feuille. */}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" {...(sheetScrollProps ?? {})}>
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
              <Presse
                key={d.iso}
                onPress={() => pickDate(d.iso)}
                activeOpacity={OPACITE_PRESSION}
                style={[s.dateChip, { backgroundColor: on ? t.accent : t.card, borderColor: on ? t.accent : t.line }]}
              >
                <Text style={[s.dateWd, { color: on ? t.onAccent : t.textTertiary }]}>{d.today ? 'Auj.' : d.wd}</Text>
                <Text style={[s.dateNum, { color: on ? t.onAccent : t.textSecondary }]}>{d.num}</Text>
                {has && <View style={[s.dateDot, { backgroundColor: on ? t.onAccent : t.textTertiary }]} />}
              </Presse>
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
            <Presse onPress={() => setPendingPhoto(null)} style={s.photoRemove} hitSlop={8}>
              <Ionicons name="close-circle" size={Icone.nav} color={t.text} />
            </Presse>
          </View>
        ) : (
          <Presse onPress={choosePhoto} style={s.photoBtn} activeOpacity={OPACITE_PRESSION}>
            <Ionicons name="camera-outline" size={Icone.standard} color={t.text} />
            <Text style={s.photoBtnTxt}>Ajouter une photo de progression</Text>
          </Presse>
        )}
        {choixPhoto && (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Presse style={[s.photoBtn, { flex: 1 }]} onPress={() => choisirSource('camera')} activeOpacity={OPACITE_PRESSION}>
              <Text style={s.photoBtnTxt}>Prendre une photo</Text>
            </Presse>
            <Presse style={[s.photoBtn, { flex: 1 }]} onPress={() => choisirSource('library')} activeOpacity={OPACITE_PRESSION}>
              <Text style={s.photoBtnTxt}>Ma galerie</Text>
            </Presse>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <LocalIcon color={t.textTertiary} size={Icone.petite} />
          <Text style={[s.photoHint, { flex: 1 }]}>Tes photos restent sur ton téléphone, jamais envoyées.</Text>
        </View>

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
        {/* ⚠️ `trackingTarget`, PAS `profile.goal_target` : le couloir vise la date que
            le moteur tiendra, pas celle qui a été saisie. Sans ça, on affiche « en
            retard » à quelqu'un qui suit le plan à la lettre — mesuré, dès J+7. */}
        <WeightChart t={t} entries={entries} width={width} goalTarget={suiviTarget} />
        {profile && suiviTarget && (
          // `paused` vient du PRODUCTEUR UNIQUE : quand le moteur a cessé de piloter
          // la trajectoire (insuffisance pondérale, poids cible à contresens), la
          // ligne idéale continue de descendre alors que le plan est au maintien —
          // sans ce drapeau on affichait « en retard » à quelqu'un à qui l'app venait
          // d'interdire tout déficit.
          <TrackVerdict
            t={t} goalTarget={suiviTarget} currentWeightKg={profile.weight_kg}
            paused={planFlags(profile).some((f) => f === 'UNDERWEIGHT_NO_DEFICIT' || f === 'GOAL_DIRECTION_MISMATCH')}
          />
        )}

        {/* Transformation : la preuve visuelle (photos LOCAL-ONLY, cf. lib/photos.ts) */}
        {Object.keys(photos).filter((d) => photos[d]).length >= 2 && (
          <>
            <SectionLabel t={t}>Transformation</SectionLabel>
            <PhotoCompare t={t} photos={photos} entries={entries} />
          </>
        )}

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
                      <Presse onPress={() => setAConfirmer(e.date)} hitSlop={8} style={s.histDel}>
                        <Ionicons name="close" size={Icone.petite} color={t.textQuaternary} />
                      </Presse>
                    </View>
                    {aConfirmer === e.date && (
                      <ConfirmationEnLigne
                        t={t}
                        question={`Supprimer cette pesée ? ${frDate(e.date)} · ${e.weight_kg} kg. Tes cibles se recalculent sur les pesées restantes.`}
                        confirmLabel="Supprimer"
                        onCancel={() => setAConfirmer(null)}
                        onConfirm={() => supprimerPesee(e.date)}
                      />
                    )}
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
    header: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.sm, gap: Spacing.sm },
    title: { color: t.text, ...Type.h2 },
    sub: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    content: { padding: Spacing.xxl, paddingTop: Spacing.md, gap: Spacing.lg, paddingBottom: Fond.feuille },
    dateRow: { gap: CHIP_GAP, paddingVertical: Spacing.xs },
    dateChip: { width: CHIP_W, height: 56, borderRadius: Radius.button, borderWidth: Trait.fin, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs },
    dateChipFuture: { backgroundColor: t.fill, borderColor: t.line, opacity: 0.5 },
    dateWd: { ...Type.microStrong, textTransform: 'capitalize' },
    dateNum: { ...Type.bodyStrong },
    dateDot: { width: 4, height: 4, borderRadius: 2, position: 'absolute', bottom: 7 },
    inputRow: { flexDirection: 'row', gap: Spacing.md },
    confirm: { backgroundColor: t.fill, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.xs },
    confirmTitle: { ...Type.bodyStrong, color: t.text },
    confirmSub: { ...Type.caption, color: t.textSecondary },
    freqHint: { ...Type.caption, color: t.textTertiary, lineHeight: 16, marginTop: -Spacing.sm },
    histCard: { backgroundColor: t.card, borderRadius: Radius.card, borderWidth: Trait.fin, borderColor: t.line, paddingHorizontal: Spacing.lg },
    histItem: { paddingVertical: Spacing.md },
    histRow: { flexDirection: 'row', alignItems: 'center' },
    histDivider: { borderBottomWidth: Trait.fin, borderBottomColor: t.line },
    histDate: { ...Type.bodySmall, flex: 1, color: t.textSecondary },
    histW: { ...Type.bodyStrong, color: t.text, width: 80, textAlign: 'right' },
    histD: { ...Type.bodySmallStrong, width: 56, textAlign: 'right' },
    histDel: { marginLeft: Spacing.md, padding: Spacing.xs },
    histNote: { ...Type.caption, color: t.textSecondary, lineHeight: 18, marginTop: Spacing.xs, fontStyle: 'italic' },
    histPhoto: { width: 64, height: 84, borderRadius: Radius.sm, marginTop: Spacing.sm, backgroundColor: t.fill },
    photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, borderRadius: Radius.button, borderWidth: Trait.fin, borderColor: t.line, borderStyle: 'dashed' },
    photoBtnTxt: { ...Type.bodyStrong, color: t.text },
    photoPreview: { alignSelf: 'flex-start' },
    photoBig: { width: 150, height: 200, borderRadius: Radius.card, backgroundColor: t.fill },
    // Pastille de fond DERRIÈRE l'icône « close-circle » de 26 : sa taille est
    // donc dictée par l'icône, et son rayon en est la moitié. Elle valait 14 pour
    // 26 de large — donc pas tout à fait un disque, ce qui se voyait au liseré.
    photoRemove: { position: 'absolute', top: -8, right: -8, backgroundColor: t.bg, width: 26, height: 26, borderRadius: 13 },
    photoHint: { ...Type.caption, color: t.textTertiary, lineHeight: 16, marginTop: -Spacing.xs },
  });
}
