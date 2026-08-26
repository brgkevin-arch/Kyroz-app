import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Image, TouchableOpacity } from 'react-native';
import { Presse } from './Presse';
import { ConfirmationEnLigne } from './ConfirmationEnLigne';
import { Ionicons } from '@expo/vector-icons';
import { ThemePalette, Radius, Spacing, Type, Fond, Trait, Icone, CIBLE_TACTILE_MIN, OPACITE_PRESSION } from '../constants/theme';
import { SHEET_MAX_WIDTH } from '../constants/layout';
import { Field, PrimaryButton, SectionLabel, Segmented, clavierScrollProps } from './ui';
import { WeightChart } from './WeightChart';
import { TrackVerdict, PhotoCompare } from './Transformation';
import { planFlags, trackingTarget } from '../lib/tdee';
import { useWeightLog } from '../hooks/useWeightLog';
import { useProfile } from '../hooks/useProfile';
import { pickProgressPhoto, cameraAvailable, PhotoSource } from '../lib/photos';
import { todayStamp, localStamp, DEFAULT_WEIGH_IN_FREQUENCY, WEIGH_IN_LABELS, historiquePesees, HISTORIQUE_MAX } from '../lib/weight';
import { applyWeighInReminder } from '../lib/notifications';
import { WeighInFrequency } from '../lib/types';
import { LocalIcon } from './Icons';
import { useRouter } from 'expo-router';
import { usePremium } from '../hooks/usePremium';

interface Props {
  t: ThemePalette;
  onClose?: () => void;
  dragHandlers?: any;
  sheetScrollProps?: any;     // injecté par <Sheet> : lie le défilement à la fermeture
}

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

// Timeline du sélecteur de date.
// 🔴 PLUS AUCUN JOUR FUTUR (2026-08-14, grief du fondateur : « la rangée de
// dates »). Trois cases grisées et intouchables occupaient la moitié du sélecteur :
// on ne savait pas où taper, et la moitié du contrôle ne servait à rien. On pèse
// aujourd'hui ou on rattrape un jour passé — jamais demain.
// ⚠️ Et la rangée est REPLIÉE par défaut : la pesée du jour est le cas de très loin
// le plus courant, elle n'a pas à coûter un choix de date.
const CHIP_W = 46;
const CHIP_GAP = 6;

export function WeightCheckin({ t, onClose, dragHandlers, sheetScrollProps }: Props) {
  const s = useMemo(() => makeStyles(t), [t]);

  // ── Verrou Kyroz+ « suivi de transformation » (2026-08-25) ─────────────────
  //
  // 🔴 CE VERROU MANQUAIT, et c'est le trou que l'audit du paywall a trouvé :
  // `transformation` était dans `PREMIUM_FEATURES` depuis le 2026-07-27, mais
  // `can('transformation')` n'était appelé NULLE PART. Le jour où `PAYWALL_LAUNCH`
  // reçoit une date, l'objectif daté se serait verrouillé et les photos seraient
  // restées ouvertes — un paywall qui annonce deux briques et n'en garde qu'une.
  //
  // ⚠️ POURQUOI ÇA A ÉCHAPPÉ, et c'est réutilisable : le verrou de l'app est branché
  // sur `profil.tsx::openEditor`, qui garde les ÉDITEURS du Profil. Les photos n'en
  // sont pas un — elles vivent dans la feuille de PESÉE, atteignable depuis Profil
  // ET depuis Plan. Un point d'étranglement ne garde que ce qui passe par lui.
  //
  // ⚠️ CE QUI EST VERROUILLÉ, ET CE QUI NE L'EST JAMAIS. La pesée, la courbe, la
  // note et l'historique sont GRATUITS et le restent — sans pesée, le TDEE ne se
  // corrige jamais et les garde-fous de perte rapide n'ont plus de signal. Ce qui
  // se vend, c'est la TRANSFORMATION : prendre de nouvelles photos, la comparaison
  // avant/après, et la trajectoire posée sur la courbe.
  //
  // ⚠️ LA VIGNETTE DE L'HISTORIQUE RESTE, elle, et c'est délibéré : elle montre une
  // photo que la personne a DÉJÀ prise. La masquer lui retirerait sa propre donnée.
  // On vend la comparaison, jamais la possession.
  const router = useRouter();
  const premium = usePremium();
  const transfoOk = premium.can('transformation');
  // ⚠️ Fermer la feuille AVANT de pousser la route. Ce fichier a déjà payé deux fois
  // le fait qu'une modale ouverte depuis une modale ne tient nulle part sur iOS —
  // une route poussée sous une feuille encore montée est la même famille de panne.
  const ouvrirKyrozPlus = () => { onClose?.(); router.push('/kyroz-plus'); };
  const { entries, photos, last, logWeight, removeWeight, setPhoto } = useWeightLog();
  // Quelle pesée attend sa confirmation (par sa DATE, qui est sa clé).
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  // Le choix de la source de photo, posé DANS la feuille pour la même raison.
  const [choixPhoto, setChoixPhoto] = useState(false);
  /** La rangée de dates est repliée : on pèse aujourd'hui, sauf exception. */
  const [choixDate, setChoixDate] = useState(false);
  /** Note et photo aussi : facultatives, elles ne doivent pas séparer le poids du bouton. */
  const [details, setDetails] = useState(false);

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
  // ⚠️ `suiviAffiche` (plus bas) et non `suiviTarget` dans le rendu : la TRAJECTOIRE
  // est vendue avec Kyroz+, la COURBE ne l'est jamais. Aujourd'hui le cas ne se
  // produit qu'après une résiliation — un compte verrouillé ne peut pas créer
  // d'objectif daté, donc `suiviTarget` y est déjà vide. C'est justement le cas
  // résiduel qu'un verrou branché sur le seul éditeur laissait passer.
  const suiviTarget = useMemo(
    () => (profile ? trackingTarget(profile, todayStamp()) : undefined),
    [profile?.goal_target?.target_date, profile?.goal_target?.target_weight_kg, profile?.weight_kg, profile?.target_kcal], // eslint-disable-line react-hooks/exhaustive-deps
  );
  /** La trajectoire réellement AFFICHÉE : rien sans Kyroz+. La courbe, elle, reste. */
  const suiviAffiche = transfoOk ? suiviTarget : undefined;

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
    // AUJOURD'HUI EN PREMIER, puis on remonte le temps. C'est l'ordre dans lequel
    // on cherche (« aujourd'hui, hier, avant-hier… ») et il rend le centrage
    // inutile : la case qu'on veut est déjà sous le pouce, à gauche.
    out.push(mk(0));
    for (let i = 1; i <= back; i++) out.push(mk(-i));
    return out;
  }, [entries]);

  // ⚠️ `stripRef` / `centerOnToday` ont disparu avec le centrage : aujourd'hui est
  // désormais la PREMIÈRE case, donc il n'y a plus rien à centrer. Du code de
  // positionnement en moins, c'est un défaut de positionnement en moins.

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

    // ⚠️ AUCUN ARTICLE DEVANT CETTE ÉTIQUETTE — la phrase disait « Point du
    // ${label} mis à jour », ce qui donnait « Point du aujourd'hui mis à jour ».
    // Même faute que celle déjà corrigée dans `OffPlanHistory`, et même remède :
    // un TIRET plutôt qu'un accord impossible. « du 5 août » et « d'aujourd'hui »
    // ne prennent pas le même article, donc aucune formulation collée ne peut
    // être juste pour les deux valeurs. La date se met devant, elle garde sa
    // majuscule, et la phrase la suit.
    const label = date === todayStamp() ? "Aujourd'hui" : frDate(date);
    setSaved({ updated, label, delta, date });
    setVal('');
    setNote('');
    setPendingPhoto(null);
  };

  // Les `HISTORIQUE_MAX` dernières pesées, écart compris. ⚠️ Le calcul de l'écart
  // est dans `lib/weight.ts`, PAS ici : tant qu'il vivait dans la boucle ci-dessous,
  // il lisait le voisin dans la liste déjà coupée et la dernière ligne montrait « — »
  // comme s'il n'y avait rien avant elle. Cf. `historiquePesees`.
  const reversed = historiquePesees(entries, HISTORIQUE_MAX);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={s.header} {...(dragHandlers ?? {})}>
        <Text style={s.title}>Suivi du poids</Text>
        {/* ⚠️ TROIS LIGNES D'EXPLICATION SONT DEVENUES UNE (2026-08-14). Elles
            poussaient la saisie ET la courbe vers le bas — deux des trois griefs
            du fondateur sur cette feuille. Ce qui a sauté n'est pas faux, c'est
            redondant : « Kyroz réajuste calories, macros et plan » est déjà dit
            par la confirmation, AU MOMENT où ça arrive. */}
        <Text style={s.sub}>Chaque pesée recale ton plan.</Text>
      </View>

      {/* Seul le ScrollView VERTICAL reçoit `sheetScrollProps` — la timeline
          horizontale juste en dessous ne doit pas fermer la feuille. */}
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} {...clavierScrollProps} {...(sheetScrollProps ?? {})}>
        {/* ── LA DATE : une LIGNE, pas un sélecteur ─────────────────────────
            La rangée de sept cases était le premier grief du fondateur. Elle
            s'ouvre désormais à la demande : le jour même est le cas de très loin
            le plus courant, il ne doit rien coûter. Le rattrapage reste à un tap. */}
        <View style={s.dateLigne}>
          <Text style={s.dateTexte}>{date === todayStamp() ? "Aujourd'hui" : frDate(date)}</Text>
          <Presse onPress={() => setChoixDate((v) => !v)} activeOpacity={OPACITE_PRESSION} style={s.dateBtn} accessibilityRole="button">
            <Text style={s.dateBtnTxt}>{choixDate ? 'Fermer' : 'Une autre date'}</Text>
            <Ionicons name={choixDate ? 'chevron-up' : 'chevron-down'} size={Icone.petite} color={t.textSecondary} />
          </Presse>
        </View>

        {choixDate && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dateRow}>
            {days.map((d) => {
              const on = d.iso === date;
              const has = entries.some((e) => e.date === d.iso);
              return (
                <Presse
                  key={d.iso}
                  onPress={() => { pickDate(d.iso); setChoixDate(false); }}
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
        )}

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
        <PrimaryButton t={t} label="Enregistrer" onPress={save} disabled={!valid} />

        {saved && (
          <View style={s.confirm}>
            <Text style={s.confirmTitle}>
              {`✓ ${saved.label} — point ${saved.updated ? 'mis à jour' : 'enregistré'}`}
              {saved.delta != null ? `  ·  ${saved.delta > 0 ? '+' : ''}${saved.delta} kg` : ''}
            </Text>
            <Text style={s.confirmSub}>{planStatusMsg(saved.date)}</Text>
          </View>
        )}

        <SectionLabel t={t}>Évolution</SectionLabel>
        {/* ⚠️ `trackingTarget`, PAS `profile.goal_target` : le couloir vise la date que
            le moteur tiendra, pas celle qui a été saisie. Sans ça, on affiche « en
            retard » à quelqu'un qui suit le plan à la lettre — mesuré, dès J+7. */}
        <WeightChart t={t} entries={entries} width={width} goalTarget={suiviAffiche} />
        {profile && suiviAffiche && (
          // `paused` vient du PRODUCTEUR UNIQUE : quand le moteur a cessé de piloter
          // la trajectoire (insuffisance pondérale, poids cible à contresens), la
          // ligne idéale continue de descendre alors que le plan est au maintien —
          // sans ce drapeau on affichait « en retard » à quelqu'un à qui l'app venait
          // d'interdire tout déficit.
          <TrackVerdict
            t={t} goalTarget={suiviAffiche} currentWeightKg={profile.weight_kg}
            paused={planFlags(profile).some((f) => f === 'UNDERWEIGHT_NO_DEFICIT' || f === 'GOAL_DIRECTION_MISMATCH')}
          />
        )}

        {/* ── LE FACULTATIF, REPLIÉ ────────────────────────────────────────
            Note et photo séparaient le poids de son bouton et poussaient la courbe
            hors de l'écran — deux des trois griefs du fondateur. Elles ne
            disparaissent pas : elles cessent d'être sur le chemin de tout le monde
            pour un usage qui n'est celui de personne tous les jours. */}
        <Presse onPress={() => setDetails((v) => !v)} activeOpacity={OPACITE_PRESSION} style={s.detailsBtn} accessibilityRole="button">
          <Ionicons name={details ? 'chevron-up' : 'add'} size={Icone.petite} color={t.textSecondary} />
          {/* ⚠️ Le libellé suit le VERROU : promettre « ou une photo » à quelqu'un qui
              ne peut pas en ajouter est exactement le mensonge que la charte interdit. */}
          <Text style={s.detailsTxt}>{details ? 'Masquer' : (transfoOk ? 'Ajouter une note ou une photo' : 'Ajouter une note')}</Text>
        </Presse>

        {details && (
          <>
        <Field
          t={t}
          label="Note (optionnel)"
          value={note}
          onChangeText={(x) => { setNote(x); setSaved(null); }}
          placeholder="ex. voyage, malade, grosse semaine d'entraînement…"
          autoCapitalize="sentences"
        />

        {/* Photo de progression (optionnelle, reste sur l'appareil) */}
        {!transfoOk ? (
          <Presse onPress={ouvrirKyrozPlus} style={s.photoBtn} activeOpacity={OPACITE_PRESSION} accessibilityRole="button">
            <Ionicons name="camera-outline" size={Icone.standard} color={t.textSecondary} />
            <Text style={[s.photoBtnTxt, { color: t.textSecondary }]}>Les photos de progression font partie de Kyroz+</Text>
          </Presse>
        ) : pendingPhoto ? (
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
        {transfoOk && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
            <LocalIcon color={t.textTertiary} size={Icone.petite} />
            {/* 🔴 « restent sur ton téléphone » ne dit PAS « tu les perdras en changeant
                de téléphone » (audit paywall, 2026-08-25) : vendre une fonctionnalité
                sans annoncer sa fragilité est un mensonge par omission. */}
            <Text style={[s.photoHint, { flex: 1 }]}>Tes photos restent sur ton téléphone, jamais envoyées — et ne sont pas sauvegardées : un changement de téléphone les perd.</Text>
          </View>
        )}
          </>
        )}

        {/* Transformation : la preuve visuelle (photos LOCAL-ONLY, cf. lib/photos.ts) */}
        {Object.keys(photos).filter((d) => photos[d]).length >= 2 && (
          <>
            <SectionLabel t={t}>Transformation</SectionLabel>
            {transfoOk ? (
              <PhotoCompare t={t} photos={photos} entries={entries} />
            ) : (
              // Cas de l'ancien abonné : ses photos sont toujours sur son téléphone et
              // toujours visibles une par une dans l'historique. Seule la COMPARAISON
              // s'en va. On le DIT, plutôt que de faire disparaître un bloc sans un mot.
              <Presse onPress={ouvrirKyrozPlus} style={s.photoBtn} activeOpacity={OPACITE_PRESSION} accessibilityRole="button">
                <Text style={[s.photoBtnTxt, { color: t.textSecondary, flex: 1, textAlign: 'center' }]}>
                  Tes photos sont toujours sur ton téléphone. La comparaison avant/après fait partie de Kyroz+.
                </Text>
              </Presse>
            )}
          </>
        )}

        {/* 🔴 « RAPPEL DE PESÉE » EST PARTI DANS LA ROUE DENTÉE le 2026-08-14
            (décision fondateur). C'est un réglage de NOTIFICATION : il vivait au
            milieu d'une saisie, entre une courbe et un historique, et le fondateur
            ne savait même pas qu'il était là. La règle de rangement du Profil
            s'applique mot pour mot (CLAUDE.md §8) : *ce réglage change-t-il ce que
            Kyroz me SERT ?* Non — il change quand Kyroz me PARLE. Il rejoint donc
            les notifications, avec le rappel quotidien. */}

        {reversed.length > 0 && (
          <>
            <SectionLabel t={t}>Historique</SectionLabel>
            <View style={s.histCard}>
              {reversed.map((e, i) => {
                const d = e.delta;
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
    dateLigne: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, minHeight: CIBLE_TACTILE_MIN },
    dateTexte: { ...Type.bodyStrong, color: t.text, flex: 1 },
    dateBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, minHeight: CIBLE_TACTILE_MIN, justifyContent: 'center' },
    dateBtnTxt: { ...Type.bodySmallStrong, color: t.textSecondary },
    detailsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button, backgroundColor: t.fill },
    detailsTxt: { ...Type.bodySmallStrong, color: t.textSecondary },
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
