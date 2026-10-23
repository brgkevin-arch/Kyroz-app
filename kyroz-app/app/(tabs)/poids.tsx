import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
import { SectionLabel } from '../../components/ui';
import { Sheet } from '../../components/Sheet';
import { WeightCheckin } from '../../components/WeightCheckin';
import { CourbePoids } from '../../components/CourbePoids';
import { HistoriquePesees } from '../../components/HistoriquePesees';
import { ObjectifIcon } from '../../components/Icons';
import { PhotoCompare } from '../../components/Transformation';
import { BlocObjectif } from '../../components/DatedGoalCard';
import { ApercuObjectif } from '../../components/ApercuObjectif';
import { useProfile } from '../../hooks/useProfile';
import { useWeightLog } from '../../hooks/useWeightLog';
import { usePremium } from '../../hooks/usePremium';
import { courbe, libelleFenetre, peutReculer, PERIODES, PERIODE_PAR_DEFAUT, Periode } from '../../lib/courbePoids';
import { todayStamp, frequencyDays } from '../../lib/weight';
import { FONCTIONS_KYROZ_PLUS } from '../../lib/offreKyrozPlus';
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
//  4. ce que Kyroz+ ajoute (objectif daté, avant/après).
// L'historique des pesées, d'où l'on supprime un point, s'ouvre par le bouton rond en
// haut à droite (2026-10-23, décision fondateur) : `components/HistoriquePesees.tsx`.
//
// ⚠️ Poids SEUL pour l'instant (décision fondateur : « plus tard on mettra tous les
// détails »). La courbe est construite pour accueillir d'autres séries — chacune
// sa carte, son écart, son axe — mais aucune autre mesure n'est stockée aujourd'hui.

const frDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

/** Le texte de vente de l'objectif daté — LA liste vendue (`lib/offreKyrozPlus.ts`), pas une copie. */
const OBJECTIF_DATE = FONCTIONS_KYROZ_PLUS.find((f) => f.feature === 'dated_goal')!;

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

  const [periode, setPeriode] = useState<Periode>(PERIODE_PAR_DEFAUT);
  const [decalage, setDecalage] = useState(0);
  const [peser, setPeser] = useState(false);
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);

  const aujourdhui = todayStamp();
  const cadence = frequencyDays(profile?.weigh_in_frequency);
  const c = useMemo(
    () => courbe(entries, periode, decalage, aujourdhui, cadence),
    [entries, periode, decalage, aujourdhui, cadence],
  );
  const reculer = peutReculer(periode, c.fenetre.debut, entries);


  // L'objectif daté se règle dans le Profil, où vivent tous les éditeurs : on y va
  // avec le drapeau que le Profil consomme à son arrivée (même chemin que les cartes
  // du Plan). Le verrou Kyroz+ reste chez lui (`openEditor`).
  const ouvrirObjectif = async () => {
    await AsyncStorage.setItem('@kyroz:openEditor', 'dated_goal');
    router.push('/profil');
  };

  const choisirPeriode = (p: Periode) => { setPeriode(p); setDecalage(0); };
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
          {/* L'HISTORIQUE, EN HAUT À DROITE (2026-10-23, décision fondateur) — même bouton
              rond que la bulle du Profil sur le Plan. Rien à lister sans pesée. */}
          {entries.length > 0 && (
            <Presse
              onPress={() => setHistoriqueOuvert(true)}
              activeOpacity={OPACITE_PRESSION}
              accessibilityRole="button"
              accessibilityLabel="Historique des pesées"
              style={s.bulle}
            >
              <Ionicons name="list" size={Icone.action} color={t.text} />
            </Presse>
          )}
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
            {/* LA RANGÉE DE PÉRIODES DÉFILE AU DOIGT (2026-10-23, vidéo de référence du
                fondateur) : des mots sans cadre, la période choisie dans une pastille à
                l'accent. Six choix ne tiennent plus en cases égales. À fond perdu, comme
                les filtres de Recettes : elle doit toucher les bords en défilant. */}
            <ScrollView
              horizontal showsHorizontalScrollIndicator={false}
              style={s.periodesWrap} contentContainerStyle={s.periodes}
            >
              {PERIODES.map((o) => {
                const on = o.value === periode;
                return (
                  <Presse
                    key={o.value} onPress={() => choisirPeriode(o.value)} activeOpacity={OPACITE_PRESSION}
                    accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={[s.periode, on && { backgroundColor: t.accent }]}
                  >
                    <Text style={{ ...(on ? Type.bodyStrong : Type.body), color: on ? t.onAccent : t.text }}>{o.label}</Text>
                  </Presse>
                );
              })}
            </ScrollView>

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

        {/* 🔴 LE VERDICT DE TRAJECTOIRE (« Dans ta zone », « En avance sur ton objectif »…)
            EST PARTI LE 2026-10-23 (décision fondateur : « enlève dans ta zone »). La carte
            de l'objectif, juste en dessous, dit déjà où l'on en est. */}
        {/* L'OBJECTIF DATÉ, À LA PLACE DE L'HISTORIQUE (2026-10-23, décision fondateur :
            « on peut personnaliser l'objectif daté pour les users Kyroz+, et la même chose
            avec un petit cadenas pour les users Free »). Posé : sa carte de suivi. Pas
            encore posé : de quoi le fixer. Sans Kyroz+ : l'aperçu flouté, un cadenas, et le tap
            ouvre la page Kyroz+ — le verrou de l'ÉDITEUR reste dans le Profil (`openEditor`). */}
        {objectifOk && profile.goal_target ? (
          <View style={s.carte}>
            <BlocObjectif t={t} profile={profile} onPress={ouvrirObjectif} />
          </View>
        ) : objectifOk ? (
          <Presse
            onPress={ouvrirObjectif} activeOpacity={OPACITE_PRESSION} accessibilityRole="button"
            accessibilityLabel="Fixer mon objectif daté" style={s.carte}
          >
            <View style={s.carteTete}>
              <ObjectifIcon color={t.text} size={Icone.action} />
              <Text style={[s.serie, { flex: 1 }]}>{OBJECTIF_DATE.titre}</Text>
              <Ionicons name="chevron-forward" size={Icone.standard} color={t.textTertiary} />
            </View>
            <Text style={s.vide}>{OBJECTIF_DATE.corps}</Text>
            <Text style={s.note}>Choisis ton poids cible et ta date.</Text>
          </Presse>
        ) : (
          // Sans Kyroz+ : le VRAI aperçu, flouté, un cadenas, le texte en bas (fondateur,
          // 2026-10-23). Le tap ouvre la page Kyroz+.
          <Presse
            onPress={() => router.push('/kyroz-plus')} activeOpacity={OPACITE_PRESSION} accessibilityRole="button"
            accessibilityLabel="Objectif daté, inclus dans Kyroz+" style={s.carte}
          >
            <View style={s.carteTete}>
              <ObjectifIcon color={t.text} size={Icone.action} />
              <Text style={[s.serie, { flex: 1 }]}>{OBJECTIF_DATE.titre}</Text>
            </View>
            <ApercuObjectif t={t} profile={profile} />
            <Text style={s.vide}>{OBJECTIF_DATE.corps}</Text>
            <Text style={s.note}>Inclus dans Kyroz+</Text>
          </Presse>
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

      </ScrollView>

      <CompactTitleBar t={t} title="Poids" opacity={repli.opacity} />

      <Sheet visible={peser} onClose={() => setPeser(false)}>
        <WeightCheckin t={t} onClose={() => setPeser(false)} />
      </Sheet>

      <Sheet visible={historiqueOuvert} onClose={() => setHistoriqueOuvert(false)}>
        <HistoriquePesees t={t} entries={entries} photos={photos} onRemove={removeWeight} />
      </Sheet>
    </SafeAreaView>
  );
}

function makeStyles(t: ThemePalette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: t.bg },
    content: { padding: Spacing.xl, gap: Spacing.lg, paddingBottom: Fond.barreOnglets },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: Spacing.md, marginBottom: Spacing.xs },
    bulle: {
      width: CIBLE_TACTILE_MIN, height: CIBLE_TACTILE_MIN, borderRadius: Radius.pill,
      backgroundColor: t.card, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.xs,
    },
    periodesWrap: { marginHorizontal: -Spacing.xl },
    periodes: { paddingHorizontal: Spacing.xl, gap: Spacing.xs },
    periode: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.pill },
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
  });
}
