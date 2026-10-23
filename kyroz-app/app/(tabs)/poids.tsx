import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Presse } from '../../components/Presse';
import {
  useTheme, ThemePalette, Radius, Spacing, Type, Fond, Trait, Icone,
  CIBLE_TACTILE_MIN, OPACITE_PRESSION,
} from '../../constants/theme';
import { useCollapsingTitle, CompactTitleBar } from '../../components/CollapsingTitle';
import { useLayout } from '../../constants/layout';
import { Segmented, SectionLabel } from '../../components/ui';
import { Sheet } from '../../components/Sheet';
import { WeightCheckin } from '../../components/WeightCheckin';
import { CourbePoids } from '../../components/CourbePoids';
import { ConfirmationEnLigne } from '../../components/ConfirmationEnLigne';
import { TrackVerdict, PhotoCompare } from '../../components/Transformation';
import { BlocObjectif } from '../../components/DatedGoalCard';
import { useProfile } from '../../hooks/useProfile';
import { useWeightLog } from '../../hooks/useWeightLog';
import { usePremium } from '../../hooks/usePremium';
import { courbe, libelleFenetre, peutReculer, PERIODES, Periode } from '../../lib/courbePoids';
import { todayStamp, frequencyDays, historiquePesees, HISTORIQUE_MAX } from '../../lib/weight';
import { planFlags, trackingTarget } from '../../lib/tdee';
import { frnum } from '../../lib/units';

// ── L'onglet Poids (2026-10-21, décision fondateur) ──────────────────────────
//
// Il REMPLACE l'onglet Profil, qui passe derrière une bulle en haut à droite du
// Plan (`app/profil.tsx`). Le poids n'était qu'une carte en tête du Profil, et sa
// courbe ne se lisait qu'en entier, d'un bout à l'autre de l'historique. Ici, on la
// lit par PÉRIODE — inspiré de la capture d'une app de composition corporelle.
//
// Ce que l'écran porte, dans l'ordre de lecture :
//  1. le poids que le moteur utilise (celui du profil) et la date de la dernière pesée ;
//  2. la courbe, par période, avec l'écart vécu sur la période ;
//  3. le geste « Me peser » — la feuille de saisie, la même que celle du Plan ;
//  4. ce que Kyroz+ ajoute (verdict de trajectoire, objectif daté, avant/après) ;
//  5. l'historique des pesées, d'où l'on supprime un point.
//
// ⚠️ Poids SEUL pour l'instant (décision fondateur : « plus tard on mettra tous les
// détails »). La courbe est construite pour accueillir d'autres séries — chacune
// sa carte, son écart, son axe — mais aucune autre mesure n'est stockée aujourd'hui.

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const frDateCourte = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export default function PoidsScreen() {
  const t = useTheme();
  const s = useMemo(() => makeStyles(t), [t]);
  const layout = useLayout();
  const repli = useCollapsingTitle();
  const router = useRouter();
  const { profile } = useProfile();
  const { entries, photos, last, due, removeWeight } = useWeightLog();
  const premium = usePremium();
  const transfoOk = premium.can('transformation');
  const objectifOk = premium.can('dated_goal');

  const [periode, setPeriode] = useState<Periode>('trimestre');
  const [decalage, setDecalage] = useState(0);
  const [peser, setPeser] = useState(false);
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);

  const aujourdhui = todayStamp();
  const cadence = frequencyDays(profile?.weigh_in_frequency);
  const c = useMemo(
    () => courbe(entries, periode, decalage, aujourdhui, cadence),
    [entries, periode, decalage, aujourdhui, cadence],
  );
  const reculer = peutReculer(periode, c.fenetre.debut, entries);

  // ⚠️ `trackingTarget`, PAS `profile.goal_target` : le verdict vise la date que le
  // moteur TIENDRA, pas celle qui a été saisie — sinon il annonce « en retard » à
  // quelqu'un qui suit le plan à la lettre (CLAUDE.md §10). Réservé à Kyroz+.
  const suiviTarget = useMemo(
    () => (profile ? trackingTarget(profile, aujourdhui) : undefined),
    [profile?.goal_target?.target_date, profile?.goal_target?.target_weight_kg, profile?.weight_kg, profile?.target_kcal, aujourdhui], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const suiviAffiche = transfoOk ? suiviTarget : undefined;

  // L'objectif daté se règle dans le Profil, où vivent tous les éditeurs : on y va
  // avec le drapeau que le Profil consomme à son arrivée (même chemin que les cartes
  // du Plan). Le verrou Kyroz+ reste chez lui (`openEditor`).
  const ouvrirObjectif = async () => {
    await AsyncStorage.setItem('@kyroz:openEditor', 'dated_goal');
    router.push('/profil');
  };

  const choisirPeriode = (p: Periode) => { setPeriode(p); setDecalage(0); };
  const historique = historiquePesees(entries, HISTORIQUE_MAX);
  const nbPhotos = Object.keys(photos).filter((d) => photos[d]).length;

  if (!profile) return null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        style={repli.zone}
        contentContainerStyle={repli.contenu([s.content, layout.content])}
        showsVerticalScrollIndicator={false}
        {...repli.scrollProps}
      >
        <View style={s.header} onLayout={repli.onHeaderLayout}>
          <Text style={s.h1}>Poids</Text>
        </View>

        {/* Le chiffre que le MOTEUR utilise — celui du profil, recalé sur la dernière
            pesée (`lib/weight.ts::recalageDuProfil`). */}
        <View style={s.hero}>
          <View style={s.valueRow}>
            <Text style={s.value}>{frnum(profile.weight_kg)}</Text>
            <Text style={s.unit}>kg</Text>
          </View>
          <Text style={s.heroSub}>
            {last ? `Dernière pesée : ${frDate(last.date)}` : 'Pas encore de pesée enregistrée'}
          </Text>
        </View>

        {entries.length >= 2 ? (
          <>
            <Segmented t={t} options={[...PERIODES]} value={periode} onChange={choisirPeriode} />

            {/* ‹ période › — « Tout » n'a rien à faire défiler. */}
            {periode !== 'tout' && (
              <View style={s.nav}>
                <Presse
                  onPress={() => setDecalage((d) => d + 1)} disabled={!reculer}
                  activeOpacity={OPACITE_PRESSION} accessibilityRole="button" accessibilityLabel="Période précédente"
                  style={[s.navBtn, !reculer && s.navOff]}
                >
                  <Ionicons name="chevron-back" size={Icone.standard} color={t.text} />
                </Presse>
                <Text style={s.navTxt} numberOfLines={1}>{libelleFenetre(c.fenetre)}</Text>
                <Presse
                  onPress={() => setDecalage((d) => Math.max(0, d - 1))} disabled={decalage === 0}
                  activeOpacity={OPACITE_PRESSION} accessibilityRole="button" accessibilityLabel="Période suivante"
                  style={[s.navBtn, decalage === 0 && s.navOff]}
                >
                  <Ionicons name="chevron-forward" size={Icone.standard} color={t.text} />
                </Presse>
              </View>
            )}

            <View style={s.carte}>
              <View style={s.carteTete}>
                <Text style={s.serie}>Poids</Text>
                {/* L'écart VÉCU sur la période, en kg. Couleur NEUTRE, toujours : une
                    hausse est un progrès en prise de masse, une baisse en sèche — l'app
                    ne juge pas le sens (§10, « zéro alarme »). */}
                {c.ecartKg != null && (
                  <View style={s.ecart}>
                    <Ionicons
                      name={c.ecartKg < 0 ? 'trending-down' : c.ecartKg > 0 ? 'trending-up' : 'remove'}
                      size={Icone.petite} color={t.text}
                    />
                    <Text style={s.ecartTxt}>
                      {c.ecartKg === 0 ? 'Stable' : `${c.ecartKg > 0 ? '+' : ''}${frnum(c.ecartKg)} kg`}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }} />
                <Text style={s.unite}>kg</Text>
              </View>
              {c.points.length > 0 ? (
                <CourbePoids t={t} courbe={c} fond={t.card} />
              ) : (
                <Text style={s.vide}>Aucune pesée sur cette période.</Text>
              )}
              {/* Règle 2 de lib/courbePoids.ts : un point moyen se DIT. */}
              {c.agregation === 'mois' && c.points.length > 0 && (
                <Text style={s.note}>Un point = la moyenne de tes pesées du mois.</Text>
              )}
            </View>
          </>
        ) : (
          <View style={s.carte}>
            <Text style={s.vide}>
              {entries.length === 1
                ? 'Encore une pesée et ta courbe apparaît ici.'
                : 'Note ta première pesée : Kyroz recale calories, macros et plan à chaque fois.'}
            </Text>
          </View>
        )}

        {/* 🔴 LE GESTE EST GRIS, PAS À L'ACCENT — dernière décision du fondateur sur la
            carte du poids (2026-09-21). Il le reste en devenant le geste de l'onglet. */}
        <Presse onPress={() => setPeser(true)} activeOpacity={OPACITE_PRESSION} accessibilityRole="button" style={s.cta}>
          <Text style={s.ctaTxt}>{due || entries.length === 0 ? 'Me peser' : 'Ajouter une pesée'}</Text>
        </Presse>

        {/* Kyroz+ — le verdict de trajectoire. La courbe, elle, ne se verrouille jamais. */}
        {suiviAffiche && (
          <TrackVerdict
            t={t} goalTarget={suiviAffiche} currentWeightKg={profile.weight_kg}
            paused={planFlags(profile).some((f) => f === 'UNDERWEIGHT_NO_DEFICIT' || f === 'GOAL_DIRECTION_MISMATCH')}
          />
        )}

        {profile.goal_target && objectifOk && (
          <View style={s.carte}>
            <BlocObjectif t={t} profile={profile} onPress={ouvrirObjectif} />
          </View>
        )}

        {nbPhotos >= 2 && (
          <>
            <SectionLabel t={t}>Transformation</SectionLabel>
            {transfoOk ? (
              <PhotoCompare t={t} photos={photos} entries={entries} />
            ) : (
              <Presse onPress={() => router.push('/kyroz-plus')} style={s.photoBtn} activeOpacity={OPACITE_PRESSION} accessibilityRole="button">
                <Text style={s.photoBtnTxt}>
                  Tes photos sont toujours sur ton téléphone. La comparaison avant/après fait partie de Kyroz+.
                </Text>
              </Presse>
            )}
          </>
        )}

        {historique.length > 0 && (
          <>
            <SectionLabel t={t}>Historique</SectionLabel>
            <View style={s.histCard}>
              {historique.map((e, i) => {
                const d = e.delta;
                return (
                  <View key={e.date} style={[s.histItem, i < historique.length - 1 && s.histDivider]}>
                    <View style={s.histRow}>
                      <Text style={s.histDate}>{frDateCourte(e.date)}</Text>
                      <Text style={s.histW}>{frnum(e.weight_kg)} kg</Text>
                      <Text style={[s.histD, { color: d == null ? t.textTertiary : d <= 0 ? t.success : t.warning }]}>
                        {d == null ? '—' : `${d > 0 ? '+' : ''}${frnum(d)}`}
                      </Text>
                      <Presse onPress={() => setAConfirmer(e.date)} hitSlop={8} style={s.histDel} accessibilityLabel="Supprimer cette pesée">
                        <Ionicons name="close" size={Icone.petite} color={t.textTertiary} />
                      </Presse>
                    </View>
                    {aConfirmer === e.date && (
                      <ConfirmationEnLigne
                        t={t}
                        question={`Supprimer cette pesée ? ${frDateCourte(e.date)} · ${frnum(e.weight_kg)} kg. Tes cibles se recalculent sur les pesées restantes.`}
                        confirmLabel="Supprimer"
                        onCancel={() => setAConfirmer(null)}
                        onConfirm={() => { setAConfirmer(null); removeWeight(e.date); }}
                      />
                    )}
                    {e.note ? <Text style={s.histNote}>{e.note}</Text> : null}
                    {photos[e.date] ? <Image source={{ uri: photos[e.date] }} style={s.histPhoto} /> : null}
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      <CompactTitleBar t={t} title="Poids" opacity={repli.opacity} />

      <Sheet visible={peser} onClose={() => setPeser(false)}>
        <WeightCheckin t={t} onClose={() => setPeser(false)} />
      </Sheet>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Fond.barreOnglets },
    header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: Spacing.xs },
    h1: { color: t.text, ...Type.display, marginTop: Spacing.xs },
    hero: { gap: Spacing.xs },
    valueRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
    value: { color: t.text, ...Type.hero },
    unit: { ...Type.h3, color: t.textSecondary },
    heroSub: { ...Type.bodySmall, color: t.textTertiary },
    nav: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    navBtn: {
      width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill,
      borderWidth: Trait.fin, borderColor: t.line, alignItems: 'center', justifyContent: 'center',
    },
    navOff: { opacity: 0.3 },
    navTxt: { ...Type.bodyStrong, color: t.textSecondary, flex: 1, textAlign: 'center' },
    carte: { backgroundColor: t.card, borderRadius: Radius.card, padding: Spacing.lg, gap: Spacing.md },
    carteTete: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    serie: { ...Type.bodyStrong, color: t.text },
    ecart: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
      backgroundColor: t.fill, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    },
    ecartTxt: { ...Type.captionStrong, color: t.text },
    unite: { ...Type.microStrong, color: t.textTertiary },
    vide: { ...Type.bodySmall, color: t.textSecondary, lineHeight: 20 },
    note: { ...Type.caption, color: t.textTertiary },
    cta: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm,
      minHeight: CIBLE_TACTILE_MIN, borderRadius: Radius.button, backgroundColor: t.fill,
    },
    ctaTxt: { ...Type.bodyStrong, color: t.text },
    photoBtn: {
      alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
      borderRadius: Radius.button, borderWidth: Trait.fin, borderColor: t.line, borderStyle: 'dashed',
      minHeight: CIBLE_TACTILE_MIN,
    },
    photoBtnTxt: { ...Type.bodyStrong, color: t.textSecondary, textAlign: 'center' },
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
  });
}
